// Push changes to origin using a Personal Access Token over HTTPS without git CLI
// Usage:
//   Set env vars then run: node scripts/push-with-token.js
//   Required: GITHUB_TOKEN
//   Optional: GITHUB_USERNAME, GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL, COMMIT_MESSAGE

const path = require('path');
const fs = require('fs');

(async () => {
  const dir = path.resolve(__dirname, '..');
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('[push] GITHUB_TOKEN 환경변수가 필요합니다.');
    process.exit(1);
  }

  const username = process.env.GITHUB_USERNAME || 'github';
  const authorName = process.env.GIT_AUTHOR_NAME || 'InsureLog';
  const authorEmail = process.env.GIT_AUTHOR_EMAIL || 'dev@insurelog.local';
  const message = process.env.COMMIT_MESSAGE || [
    'perf(api): RSS/Sitemap에 ETag+Last-Modified 추가, 304 응답 지원',
    'perf(metrics): 허용 메트릭 화이트리스트 및 봇 UA 필터링 적용',
    'perf(db): posts 테이블 인덱스 추가(idx_status_created_at, idx_category_status_created_at, idx_status_view_count, idx_published_created_at)',
    'refactor(feed): 기본적으로 refined_content 제외, 필요 시 FEED_INCLUDE_CONTENT=1로 opt-in'
  ].join('\n');
  const forcePush = process.env.FORCE_PUSH === '1';

  const git = require('isomorphic-git');
  const http = require('isomorphic-git/http/node');

  try {
    const gitDir = path.join(dir, '.git');
    const git = require('isomorphic-git');
    const http = require('isomorphic-git/http/node');
    // Ensure .git exists (init if missing)
    if (!fs.existsSync(gitDir)) {
      console.log('[push] .git이 없어 초기화합니다.');
      await git.init({ fs, dir });
    }

    // Stage modified files for this optimization
    const baseFiles = [
      'api/feed.js',
      'api/sitemap.js',
      'api/metrics.js',
      'supabase/config.toml',
      'vercel.json',
      // 추가: 최근 성능 작업으로 수정된 파일들
      'index.html',
      'css/base.css'
    ];
    for (const f of baseFiles) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) {
        await git.add({ fs, dir, filepath: f });
      }
    }
    // Stage all migrations (*.sql)
    const migDir = path.join(dir, 'supabase', 'migrations');
    if (fs.existsSync(migDir)) {
      const entries = await fs.promises.readdir(migDir);
      for (const e of entries) {
        if (e.endsWith('.sql')) {
          const fp = path.join('supabase', 'migrations', e);
          await git.add({ fs, dir, filepath: fp });
        }
      }
    }

    // Commit
    const sha = await git.commit({
      fs,
      dir,
      message,
      author: { name: authorName, email: authorEmail },
    });
    console.log(`[push] 커밋 생성 완료: ${sha}`);

    // Determine current branch
    const desiredRef = process.env.PUSH_REF || null;
    const currentBranch = await git.currentBranch({ fs, dir, fullname: false });
    let ref = desiredRef || currentBranch || 'main';
    console.log(`[push] 현재 브랜치: ${ref}`);
    if (!currentBranch || desiredRef) {
      const branches = await git.listBranches({ fs, dir });
      if (!branches.includes(ref)) {
        await git.branch({ fs, dir, ref });
        console.log(`[push] 로컬 브랜치 생성: ${ref}`);
      }
      await fs.promises.writeFile(path.join(dir, '.git', 'HEAD'), `ref: refs/heads/${ref}`);
    }

    // Ensure remote 'origin'
    const remotes = await git.listRemotes({ fs, dir });
    const origin = remotes.find(r => r.remote === 'origin');
    const remoteUrl = process.env.REMOTE_URL;
    if (!origin) {
      if (!remoteUrl) {
        throw new Error('원격 origin이 없으며 REMOTE_URL 환경변수가 필요합니다. 예: https://github.com/<user>/<repo>.git');
      }
      await git.addRemote({ fs, dir, remote: 'origin', url: remoteUrl });
      console.log(`[push] origin 원격을 추가했습니다: ${remoteUrl}`);
    }

    // Fetch & pull to avoid non-fast-forward
    try {
      await git.fetch({ fs, http, dir, remote: 'origin', ref, onAuth: () => ({ username, password: token }) });
      await git.pull({ fs, http, dir, remote: 'origin', ref, singleBranch: true, author: { name: authorName, email: authorEmail }, onAuth: () => ({ username, password: token }), fastForwardOnly: false });
      console.log('[push] 원격 변경을 병합했습니다.');
    } catch (e) {
      console.warn('[push] pull 실패, 계속 진행합니다:', e.message || e);
    }

    // Push to origin
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref,
      force: forcePush,
      onAuth: () => ({ username, password: token }),
    });
    console.log('[push] 원격(origin)으로 푸시 완료');
  } catch (err) {
    console.error('[push] 실패:', err.message || err);
    process.exit(1);
  }
})();