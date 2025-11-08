const fs = require('fs');
const path = require('path');
// .env.local 로더: 프로젝트 루트의 .env.local을 읽어 환경변수에 주입
(() => {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      raw.split(/\r?\n/).forEach(line => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return;
        const m = t.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
        if (!m) return;
        const key = m[1];
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] == null) process.env[key] = val;
      });
      console.log('[env] .env.local 로드 완료');
    }
  } catch (e) {
    console.warn('[env] .env.local 로드 실패:', e.message || e);
  }
})();
const https = require('https');

function parseRepo(remoteUrl) {
  // e.g. https://github.com/owner/repo.git
  const m = remoteUrl.match(/github\.com\/(.+?)\/(.+?)(\.git)?$/);
  if (!m) throw new Error('REMOTE_URL에서 소유자/저장소를 파싱할 수 없습니다.');
  return { owner: m[1], repo: m[2] };
}

function apiRequest(token, method, pathname, body) {
  const options = {
    hostname: 'api.github.com',
    path: pathname,
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'trae-ai-push-script',
      'Accept': 'application/vnd.github+json',
    }
  };
  let payload = null;
  if (body) {
    payload = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(payload);
  }
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`GitHub API ${method} ${pathname} 실패: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getDefaultBranch(token, owner, repo) {
  const repoInfo = await apiRequest(token, 'GET', `/repos/${owner}/${repo}`);
  return repoInfo.default_branch || 'main';
}

async function getBranchHeadSha(token, owner, repo, branch) {
  try {
    const ref = await apiRequest(token, 'GET', `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`);
    return ref.object && ref.object.sha;
  } catch (e) {
    return null;
  }
}

async function createBranch(token, owner, repo, newBranch, baseBranch) {
  const baseSha = await getBranchHeadSha(token, owner, repo, baseBranch);
  if (!baseSha) throw new Error(`기준 브랜치 ${baseBranch}의 HEAD SHA를 찾을 수 없습니다.`);
  await apiRequest(token, 'POST', `/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${newBranch}`,
    sha: baseSha,
  });
}

async function getFileSha(token, owner, repo, ref, filePath) {
  try {
    const info = await apiRequest(token, 'GET', `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`);
    return info.sha;
  } catch (e) {
    return null; // 파일이 없으면 sha 없음
  }
}

async function createOrUpdateFile(token, owner, repo, branch, filePath, message) {
  const abs = path.join(process.cwd(), filePath);
  const content = await fs.promises.readFile(abs);
  const b64 = content.toString('base64');
  const existingSha = await getFileSha(token, owner, repo, branch, filePath);
  const body = {
    message,
    content: b64,
    branch,
  };
  if (existingSha) body.sha = existingSha;
  const res = await apiRequest(token, 'PUT', `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, body);
  return res.commit && res.commit.sha;
}

async function openPullRequest(token, owner, repo, head, base, title, body) {
  try {
    const pr = await apiRequest(token, 'POST', `/repos/${owner}/${repo}/pulls`, { title, head, base, body });
    return pr.html_url;
  } catch (e) {
    return null;
  }
}

async function mergePullRequest(token, owner, repo, prNumber, commitMessage) {
  try {
    const res = await apiRequest(token, 'PUT', `/repos/${owner}/${repo}/pulls/${prNumber}/merge`, { commit_title: commitMessage, merge_method: 'squash' });
    return res.merged === true;
  } catch (e) {
    return false;
  }
}

async function findOpenPRForBranch(token, owner, repo, branch) {
  try {
    const prs = await apiRequest(token, 'GET', `/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${branch}`);
    if (Array.isArray(prs) && prs.length > 0) return prs[0];
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const remoteUrl = process.env.REMOTE_URL;
  const branch = process.env.PUSH_REF || `perf/etags-head-${Date.now()}`;
  const message = process.env.COMMIT_MESSAGE || 'chore: update via API';
  if (!token) throw new Error('GITHUB_TOKEN 환경변수가 필요합니다.');
  if (!remoteUrl) throw new Error('REMOTE_URL 환경변수가 필요합니다.');
  const { owner, repo } = parseRepo(remoteUrl);

  const files = [
    // 이번 변경 사항 반영: dead code 정리 및 UI 최적화
    'index.html',
    'css/main.css',
    'css/skeleton.css',
    'style.css',
    // 로컬 개발 서버 스크립트 추가
    'scripts/dev-server.js',
    // 기존 목록 유지 (레이아웃/앱 관련 파일 포함)
    'css/layout.css',
    'js/blog-app.js',
    'js/layout-manager.js',
  ];

  const commitShas = [];
  // Ensure branch exists
  const defaultBranch = await getDefaultBranch(token, owner, repo);
  const existingHead = await getBranchHeadSha(token, owner, repo, branch);
  if (!existingHead) {
    await createBranch(token, owner, repo, branch, defaultBranch);
    console.log(`[api-push] 기능 브랜치 생성: ${branch} (base=${defaultBranch})`);
  }
  for (const f of files) {
    try {
      const sha = await createOrUpdateFile(token, owner, repo, branch, f, message);
      console.log(`[api-push] 파일 업데이트 완료: ${f} (commit=${sha})`);
      if (sha) commitShas.push(sha);
    } catch (e) {
      console.warn(`[api-push] 파일 업데이트 실패: ${f}:`, e.message || e);
    }
  }

  const prTitle = message.split('\n')[0];
  let prUrl = await openPullRequest(token, owner, repo, branch, defaultBranch, prTitle, '자동 생성 PR (API 업로드)');
  let prNumber = null;
  if (!prUrl) {
    const existing = await findOpenPRForBranch(token, owner, repo, branch);
    if (existing) {
      prUrl = existing.html_url;
      prNumber = existing.number;
    }
  }
  if (prUrl) {
    console.log(`[api-push] PR 생성/발견: ${prUrl}`);
    if (process.env.AUTO_MERGE === '1') {
      if (!prNumber) prNumber = parseInt(prUrl.split('/').pop(), 10);
      const merged = await mergePullRequest(token, owner, repo, prNumber, prTitle);
      console.log(merged ? '[api-push] PR 자동 머지 완료' : '[api-push] PR 자동 머지 실패 또는 제한됨');
    }
  } else {
    console.log('[api-push] PR 생성 실패 혹은 필요 없음. 브랜치로 직접 푸시되었습니다.');
  }
}

main().catch(err => {
  console.error('[api-push] 오류:', err);
  process.exit(1);
});