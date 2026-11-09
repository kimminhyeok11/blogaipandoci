import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { notifyIndexNow } from "@/lib/indexnow";
import { refreshSituationsCache } from "@/lib/situations";
import { addInternalLinks, getCachedKeywords, isWordBoundary } from "@/lib/internal-links";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getIndexNowConfig() {
  const key = process.env.INDEXNOW_KEY;
  const host = (process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return { key, host };
}

// 불용어 (매칭에서 제외할 짧거나 의미 없는 단어)
const STOP_WORDS = new Set([
  '의', '가', '이', '은', '는', '을', '를', '에', '와', '과', '도', '로', '으로',
  '에서', '까지', '부터', '대한', '위한', '통한', '대해', '관한', '있는', '없는',
  '하는', '되는', '위해', '통해', '때문', '그리고', '하지만', '그래서', '또한',
  '이런', '저런', '어떤', '모든', '위', '아래', '것', '수', '등', '중',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'and', 'or', 'but', 'not', 'with', 'by', 'from', 'how', 'what', 'why',
]);

// n-gram 집합 생성 (제목 유사도 계산용)
function getNGrams(text: string, n: number = 2): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  const grams = new Set<string>();
  for (let i = 0; i <= normalized.length - n; i++) {
    grams.add(normalized.substring(i, i + n));
  }
  return grams;
}

// Jaccard 유사도 계산 (두 집합의 교집합/합집합)
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// 제목 유사도 계산 (Jaccard + 부분 문자열 매칭)
function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const a = titleA.toLowerCase();
  const b = titleB.toLowerCase();
  
  // 1. Jaccard 유사도 (2-gram)
  const gramsA = getNGrams(a, 2);
  const gramsB = getNGrams(b, 2);
  const jaccardScore = jaccardSimilarity(gramsA, gramsB);
  
  // 2. 부분 문자열 매칭 (포함 관계)
  let substringScore = 0;
  // 공백 제거한 제목끼리 비교
  const aNoSpace = a.replace(/\s+/g, '');
  const bNoSpace = b.replace(/\s+/g, '');
  
  if (aNoSpace.includes(bNoSpace) || bNoSpace.includes(aNoSpace)) {
    substringScore = 0.5; // 하나가 다른 하나를 포함하면 높은 점수
  }
  
  // 3. 키워드 매칭 (기존 로직 유지)
  const keywordsA = a.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
  const keywordsB = b.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
  const commonKeywords = keywordsA.filter(k => keywordsB.includes(k));
  const keywordScore = commonKeywords.length / Math.max(keywordsA.length, keywordsB.length, 1);
  
  // 종합 점수 (가중치: Jaccard 50% + 부분 매칭 30% + 키워드 20%)
  return jaccardScore * 0.5 + substringScore * 0.3 + keywordScore * 0.2;
}

// 관련 글 찾기: 벡터 검색 기반 (embedding 사용)
// 발행글 embedding 저장 입력과 동일한 텍스트 조합 — 쿼리 벡터와 저장 벡터의
// 입력이 일치해야 유사도가 정확하다 (기존엔 쿼리가 제목만 임베딩해 불일치).
function buildEmbeddingText(title: string, stagePart: string | undefined, excerpt: string | undefined, content: string): string {
  return [title, stagePart || "", excerpt || "", content.replace(/[#*`\[\]()!]/g, "").slice(0, 5500)]
    .filter(Boolean)
    .join(" ");
}

async function openaiEmbed(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const vec = data?.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length === 1536 ? vec : null;
  } catch {
    return null;
  }
}

// pgvector RPC(match_similar_posts) 기반 관련 글 검색 — 저장 벡터와 같은
// 복합 입력으로 쿼리하고, 같은 case_type에 소폭 가산점을 줘 법률 수직 일관성을 높인다.
async function findRelatedPosts(
  serviceSupabase: any,
  title: string,
  excludeSlug: string,
  maxCount: number = 5,
  queryText?: string,
  caseType?: string | null
): Promise<{ title: string; slug: string }[]> {
  try {
    const queryVector = await openaiEmbed(queryText || title);
    if (!queryVector) {
      return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
    }

    // 자기글 id 조회 (POST는 아직 insert 전이라 없을 수 있음)
    const { data: selfPost } = await serviceSupabase
      .from("posts")
      .select("id")
      .eq("slug", excludeSlug)
      .maybeSingle();

    const { data, error } = await serviceSupabase.rpc("match_similar_posts", {
      query_embedding: queryVector,
      exclude_post_id: selfPost?.id ?? "00000000-0000-0000-0000-000000000000",
      match_count: Math.min(50, maxCount * 4),
    });

    if (error || !data || data.length === 0) {
      return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
    }

    const scored = (data as any[])
      .filter((p) => typeof p.similarity === "number" && p.similarity >= 0.5 && p.slug !== excludeSlug)
      .map((p) => ({ ...p, score: p.similarity + (caseType && p.case_type === caseType ? 0.03 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(({ title, slug }: any) => ({ title, slug }));

    return scored.length > 0 ? scored : findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
  } catch (err) {
    console.error('벡터 검색 실패, 기존 방식 사용:', err);
    return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
  }
}

// 기존 방식: 제목 유사도 기반 (폴백)
async function findRelatedPostsByTitle(
  serviceSupabase: any,
  title: string,
  excludeSlug: string,
  maxCount: number = 5
): Promise<{ title: string; slug: string }[]> {
  try {
    const { data: posts, error } = await serviceSupabase
      .from('posts')
      .select('title, slug')
      .eq('published', true)
      .not('published_at', 'is', null)
      .neq('slug', excludeSlug)
      .order('published_at', { ascending: false })
      .limit(200);

    if (error || !posts || posts.length === 0) return [];

    const scored = posts.map((post: any) => {
      const similarity = calculateTitleSimilarity(title, post.title || '');
      return { ...post, score: similarity };
    });

    return scored
      .filter((p: any) => p.score >= 0.1)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, maxCount)
      .map(({ title, slug }: any) => ({ title, slug }));
  } catch (err) {
    console.error('관련 글 검색 실패:', err);
    return [];
  }
}

// 본문에 관련 글 키워드 인라인 링크 자동 삽입
// - 글 제목에서 핵심 키워드(3자 이상) 추출
// - 본문에서 첫 번째 등장 위치에만 링크 삽입 (과도한 링크 방지)
// - 코드블록·헤딩·이미 링크된 구간 제외
// - 자기글 제외
function injectInlineLinks(content: string, relatedPosts: { title: string; slug: string }[], currentSlug: string, maxInline: number = 3): string {
  if (relatedPosts.length === 0 || maxInline <= 0) return content;

  // 자기글 제외
  const filteredPosts = relatedPosts.filter(post => post.slug !== currentSlug);
  if (filteredPosts.length === 0) return content;

  // 제외 구간(코드블록·기존 링크·헤딩) 계산 — 삽입할 때마다 현재 문자열 기준으로
  // 재계산한다. 삽입으로 위치가 밀려 기존 범위가 어긋나면 링크 앵커 내부에
  // 중첩 링크가 삽입되는 부식이 생기므로 고정 범위는 쓰지 않는다.
  const makeExclusion = (text: string) => {
    const codeBlockRanges: [number, number][] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let m: RegExpExecArray | null;
    while ((m = codeBlockRegex.exec(text)) !== null) {
      codeBlockRanges.push([m.index, m.index + m[0].length]);
    }
    const linkedRanges: [number, number][] = [];
    const linkRegex = /\[([^\]]+)\]\([^)]+\)/g;
    while ((m = linkRegex.exec(text)) !== null) {
      linkedRanges.push([m.index, m.index + m[0].length]);
    }
    const headingRanges: [number, number][] = [];
    const headingRegex = /^#{1,6} .+$/gm;
    while ((m = headingRegex.exec(text)) !== null) {
      headingRanges.push([m.index, m.index + m[0].length]);
    }
    return (idx: number) =>
      codeBlockRanges.some(([s, e]) => idx >= s && idx < e) ||
      linkedRanges.some(([s, e]) => idx >= s && idx < e) ||
      headingRanges.some(([s, e]) => idx >= s && idx < e);
  };

  let result = content;
  let isExcluded = makeExclusion(result);
  const usedKeywords = new Set<string>();

  // 관련 글마다 핵심 키워드 추출 후 본문 치환 (글당 최대 1개 키워드만)
  for (const post of filteredPosts) {
    // 제목에서 불용어 제외 3자 이상 키워드 추출, 긴 것 우선
    const keywords = post.title
      .split(/[\s\-·,()]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
      .sort((a, b) => b.length - a.length);

    let injected = false;
    for (const keyword of keywords) {
      if (usedKeywords.has(keyword)) continue;

      // 첫 등장부터 순서대로 단어 경계·제외 구간을 통과하는 첫 매치를 찾는다
      // (기소장 속 "기소"처럼 더 긴 단어 내부 매칭은 건너뛴다)
      let keywordIdx = -1;
      let from = 0;
      while ((keywordIdx = result.indexOf(keyword, from)) !== -1) {
        if (isWordBoundary(result, keywordIdx, keyword.length) && !isExcluded(keywordIdx)) break;
        from = keywordIdx + 1;
      }
      if (keywordIdx === -1) continue;

      // 첫 번째 등장 위치에만 링크 삽입 (마크다운 형식) — ?ri=1 마커로 자동 생성 소유권 표시
      result =
        result.slice(0, keywordIdx) +
        `[${keyword}](/posts/${post.slug}?ri=1)` +
        result.slice(keywordIdx + keyword.length);

      isExcluded = makeExclusion(result);
      usedKeywords.add(keyword);
      injected = true;
      break; // 글당 1개 키워드만
    }
    // 최대 maxInline개 글만 인라인 링크 삽입 (과도한 링크 방지)
    if (usedKeywords.size >= maxInline) break;
    void injected;
  }

  return result;
}

// 본문 하단에 관련 글 링크 마크다운 삽입 + 본문 인라인 링크 삽입
// 이전 발행 시 삽입된 인라인 내부 링크 제거 (재발행 시 최신 슬러그로 교체하기 위해)
function removeInjectedInlineLinks(content: string): string {
  // ?ri=1 마커가 붙은 자동 삽입 링크만 키워드 텍스트로 복원 —
  // 마커 없는 /posts/ 링크는 저자 수작업 또는 방금 삽입된 키워드 링크(?il=1)이므로 보존
  return content.replace(/\[([^\]]+)\]\([^)]*?[?&]ri=1[^)]*\)/g, '$1');
}

function appendRelatedLinks(content: string, relatedPosts: { title: string; slug: string }[], currentSlug: string): string {
  if (relatedPosts.length === 0) return content;

  // 기존 관련글 섹션 제거 (재발행 시 최신화)
  // 더 강력한 제거: "---" 이후 모든 관련글 섹션 제거
  let withoutRelatedSection = content;

  // 다양한 형식의 관련글 섹션 패턴
  const patterns = [
    /\n\n---\n\n### 📌 관련 글\n[\s\S]*$/m,
    /\n\n---\n\n### 관련 글\n[\s\S]*$/m,
    /\n\n---\n\n### 📌 관련글\n[\s\S]*$/m,
    /\n\n---\n\n### 관련글\n[\s\S]*$/m,
    /\n\n---\n\n#### 📌 관련 글\n[\s\S]*$/m,
    /\n\n---\n\n#### 관련 글\n[\s\S]*$/m,
    /\n\n---\n\n#{1,4}\s*관련\s*글\n[\s\S]*$/m,
    /\n\n---\n\n#{1,4}\s*📌\s*관련\s*글\n[\s\S]*$/m,
  ];

  for (const pattern of patterns) {
    withoutRelatedSection = withoutRelatedSection.replace(pattern, '');
  }

  // 이전에 삽입된 인라인 /posts/ 링크 제거 후 재삽입
  const unlinked = removeInjectedInlineLinks(withoutRelatedSection);

  // 본문 인라인 링크 삽입 (자기글 제외) — 본문 내 내부링크 총량이
  // "본문 전체 최대 5개" 규칙을 넘지 않게 잔여 예산을 넘긴다
  const internalLinkCount = (unlinked.match(/\]\(\/(posts|cases)\//g) || []).length;
  const withInline = injectInlineLinks(unlinked, relatedPosts, currentSlug, Math.min(3, Math.max(0, 5 - internalLinkCount)));

  const links = relatedPosts
    .map(p => `- [${p.title}](/posts/${p.slug}?ri=1)`)
    .join('\n');

  return `${withInline.trimEnd()}\n\n---\n\n### 📌 관련 글\n${links}\n`;
}

// GET /api/posts - 글 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const all = searchParams.get("all") === "true";

    // 관리자 전체 조회 (미발행 포함) — 토큰 검증 필요
    if (all) {
      const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
      if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

      const serviceSupabase = makeAdmin();
      const { data: { user: authUser } } = await serviceSupabase.auth.getUser(token);
      if (!authUser) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

      const { data: profile, error: profileError } = await serviceSupabase.from("users").select("role").eq("id", authUser.id).single();
      if (profileError || !profile) return NextResponse.json({ error: "프로필 조회 실패" }, { status: 500 });
      if (profile.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

      const { data, error, count } = await serviceSupabase
        .from("posts")
        .select("id, title, slug, published, published_at, created_at, view_count", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ posts: data, count });
    }

    const { data, error, count } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: data, count }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts - 새 글 작성
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No valid token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();
    const { title, slug, content, excerpt, cover_image, cover_image_alt, published,
      meta_title, meta_description,
      case_type, current_stage, next_stage, estimated_duration, involved_agencies, common_mistakes, expert_level,
      timeline_steps
    } = body;

    const serviceSupabase = makeAdmin();

    // 자동화 파이프라인 토큰 — 서버 측 발행 경로 (env AUTOMATION_TOKEN, 관리자 권한 부여)
    const isAutomation = Boolean(process.env.AUTOMATION_TOKEN) && token === process.env.AUTOMATION_TOKEN;

    let userId: string | null = null;
    if (isAutomation) {
      const { data: adminUser } = await serviceSupabase
        .from("users").select("id").eq("role", "admin").limit(1).single();
      userId = adminUser?.id ?? null;
      if (!userId) {
        return NextResponse.json({ error: "관리자 계정을 찾을 수 없습니다" }, { status: 500 });
      }
    } else {
      // 토큰으로 user_id 결정 — body.user_id 우회 차단
      const { data: { user: authUser } } = await serviceSupabase.auth.getUser(token);
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = authUser.id;

      // 관리자만 글 작성 가능
      const { data: profile, error: profileError } = await serviceSupabase
        .from("users")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: "프로필 조회 실패" }, { status: 500 });
      }

      if (profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden - 관리자만 글을 작성할 수 있습니다" }, { status: 403 });
      }
    }

    // slug 중복 확인 후 자동 suffix 추가 (동시 요청 시 충돌 방지)
    let finalSlug = slug;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: existing } = await serviceSupabase
        .from("posts")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (!existing) break;

      // 유니크한 suffix 생성 (랜덤 + 타임스탬프)
      const randomSuffix = Math.random().toString(36).slice(-4);
      const timestampSuffix = Date.now().toString(36).slice(-4);
      finalSlug = `${slug.slice(0, 20)}-${timestampSuffix}${randomSuffix}`;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: "슬러그 생성 실패 (동시 요청 과다)" }, { status: 500 });
    }

    // 발행 시 관련 글 자동 삽입
    let finalContent = content;
    if (published) {
      // DB 키워드 기반 내부 링크 추가 (마크다운 형식)
      const keywords = await getCachedKeywords();
      const currentPostUrl = `/posts/${finalSlug}`;
      finalContent = addInternalLinks(content, 5, keywords, currentPostUrl);

      // 제목 유사도 기반 관련 글 섹션 추가 (마크다운 형식) — 저장 임베딩과 동일한 복합 입력으로 쿼리
      const stagePart = [current_stage, next_stage].filter(Boolean).join(" → ");
      const queryText = buildEmbeddingText(title, stagePart, excerpt, finalContent);
      const relatedPosts = await findRelatedPosts(serviceSupabase, title, finalSlug, 5, queryText, case_type);
      finalContent = appendRelatedLinks(finalContent, relatedPosts, finalSlug);
    }

    // case_type → category_id 자동 매핑
    let categoryId = null;
    if (case_type) {
      const { data: cat } = await serviceSupabase
        .from("categories")
        .select("id")
        .eq("name", case_type)
        .single();
      if (cat) categoryId = cat.id;
    }

    const { data, error } = await serviceSupabase
      .from("posts")
      .insert({
        title,
        slug: finalSlug,
        content: finalContent,
        excerpt,
        cover_image,
        cover_image_alt,
        published,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
        user_id: userId,
        published_at: published ? new Date().toISOString() : null,
        case_type: case_type || null,
        category_id: categoryId,
        current_stage: current_stage || null,
        next_stage: next_stage || null,
        estimated_duration: estimated_duration || null,
        involved_agencies: involved_agencies || null,
        common_mistakes: common_mistakes || null,
        expert_level: expert_level || null,
        timeline_steps: timeline_steps || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create post:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // embedding 생성 — await로 완료. 기존 fire-and-forget은 응답 반환 후
    // 서버리스 프로세스가 종료돼 벡터가 유실됐다(실측 43/234건 미기록).
    if (published && data?.id && process.env.OPENAI_API_KEY) {
      const stagePart = [current_stage, next_stage].filter(Boolean).join(" → ");
      const vec = await openaiEmbed(buildEmbeddingText(title, stagePart, excerpt, finalContent));
      if (vec) {
        const { error: embErr } = await serviceSupabase
          .from("posts")
          .update({ embedding: JSON.stringify(vec) })
          .eq("id", data.id);
        if (embErr) console.error("[embedding/post] DB 저장 실패:", embErr.message);
      } else {
        console.error("[embedding/post] 벡터 생성 실패 — 관련글 추천이 폴백으로 동작");
      }
    }

    // process_embedding 생성 (절차 데이터가 있을 때만) — 동일하게 await
    if (published && data?.id && process.env.OPENAI_API_KEY && (current_stage || next_stage || (timeline_steps && timeline_steps.length > 0))) {
      const processText = [current_stage, next_stage, ...(timeline_steps || [])].filter(Boolean).join(" → ");
      const pvec = await openaiEmbed(processText.slice(0, 2000));
      if (pvec) {
        const { error: pErr } = await serviceSupabase
          .from("posts")
          .update({ process_embedding: JSON.stringify(pvec) })
          .eq("id", data.id);
        if (pErr) console.error("[process-embedding/post] DB 저장 실패:", pErr.message);
      }
    }

    // 캐시 즉시 갱신
    if (published) {
      revalidatePath("/", "page");
      revalidatePath("/posts", "page");
      revalidatePath(`/posts/${finalSlug}`, "page");
      revalidatePath("/tags", "page");
      revalidatePath("/categories", "page");
      revalidatePath("/cases", "page");
      if (case_type) revalidatePath(`/cases/${encodeURIComponent(case_type)}`, "page");

      // IndexNow 알림 (신규 발행) — await로 완료해 서버리스 종료 유실 방지
      const { key, host } = getIndexNowConfig();
      if (key) {
        const siteUrl = `https://${host}`;
        await notifyIndexNow([`${siteUrl}/posts/${encodeURIComponent(finalSlug)}`, `${siteUrl}/posts`, siteUrl], key, host)
          .catch((err) => { console.error("[IndexNow POST] 네트워크 오류:", err?.message); });
      }

      // situations_cache 갱신 (비동기, 실패해도 발행에 영향 없음)
      refreshSituationsCache().catch(() => {});
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

// PUT /api/posts - 글 수정
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No valid token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();
    const { id, title, slug, content, excerpt, cover_image, cover_image_alt, published,
      meta_title, meta_description,
      case_type, current_stage, next_stage, estimated_duration, involved_agencies, common_mistakes, expert_level,
      timeline_steps
    } = body;

    const serviceSupabase = makeAdmin();

    // 서비스롤키인 경우 인증 건너뛰기 (일괄처리용)
    // 자동화 파이프라인 토큰 — 서버 측 발행 경로 (env AUTOMATION_TOKEN)
    const isAutomation = Boolean(process.env.AUTOMATION_TOKEN) && token === process.env.AUTOMATION_TOKEN;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServiceKey = isAutomation || (serviceKey && token === serviceKey);
    let authUser = null;

    if (!isServiceKey) {
      // 사용자 토큰 인증
      const { data: { user: authUserData } } = await serviceSupabase.auth.getUser(token);
      if (!authUserData) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      authUser = authUserData;

      const { data: profile, error: profileError } = await serviceSupabase
        .from("users").select("role").eq("id", authUser.id).single();
      if (profileError || !profile) {
        return NextResponse.json({ error: "프로필 조회 실패" }, { status: 500 });
      }
      if (profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden - 관리자만 글을 수정할 수 있습니다" }, { status: 403 });
      }
    }
    // 서비스롤키인 경우 인증 건너뜀

    // Check if user owns this post
    const { data: existingPost, error: fetchError } = await serviceSupabase
      .from("posts")
      .select("user_id, published_at, published, slug")
      .eq("id", id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 서비스롤키가 아닌 경우에만 글 소유권 체크
    if (!isServiceKey && authUser && existingPost.user_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden - Not your post" },
        { status: 403 }
      );
    }

    // 발행 시 관련 글 자동 삽입 (수정 시에도 갱신)
    let finalContent = content;
    if (published) {
      console.log('[PUT] received content has 관련글:', content.includes('### 📌 관련 글') || content.includes('### 관련 글'));

      // DB 키워드 기반 내부 링크 추가 (마크다운 형식)
      const keywords = await getCachedKeywords();
      const currentPostUrl = `/posts/${slug}`;
      finalContent = addInternalLinks(content, 5, keywords, currentPostUrl);

      // 제목 유사도 기반 관련 글 섹션 추가 (마크다운 형식)
      // 사용자가 이미 관련글 섹션을 지웠으면 다시 추가하지 않음
      const hasRelatedSection = content.includes('### 📌 관련 글') || content.includes('### 관련 글');
      if (!hasRelatedSection) {
        const stagePart = [current_stage, next_stage].filter(Boolean).join(" → ");
        const queryText = buildEmbeddingText(title, stagePart, excerpt, finalContent);
        const relatedPosts = await findRelatedPosts(serviceSupabase, title, slug, 5, queryText, case_type);
        console.log('[PUT] findRelatedPosts count:', relatedPosts.length);
        finalContent = appendRelatedLinks(finalContent, relatedPosts, slug);
        console.log('[PUT] finalContent has 관련글:', finalContent.includes('### 📌 관련 글'));
      } else {
        console.log('[PUT] 사용자가 관련글 섹션을 지웠으므로 다시 추가하지 않음');
      }
    }

    // case_type 변경 시 category_id 자동 매핑
    let categoryIdUpdate = undefined;
    if (case_type !== undefined) {
      if (case_type === null || case_type === "") {
        categoryIdUpdate = null;
      } else {
        const { data: cat } = await serviceSupabase
          .from("categories")
          .select("id")
          .eq("name", case_type)
          .single();
        categoryIdUpdate = cat?.id || null;
      }
    }

    const { data, error } = await serviceSupabase
      .from("posts")
      .update({
        title,
        slug,
        content: finalContent,
        excerpt,
        ...(cover_image !== undefined ? { cover_image } : {}),
        ...(cover_image_alt !== undefined ? { cover_image_alt } : {}),
        published,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
        // 이미 발행된 글이면 published_at 유지, 신규 발행 시에만 현재 시간 설정
        published_at: published
          ? (existingPost.published && existingPost.published_at
              ? existingPost.published_at
              : new Date().toISOString())
          : null,
        updated_at: new Date().toISOString(),
        case_type: case_type !== undefined ? (case_type || null) : undefined,
        ...(categoryIdUpdate !== undefined && { category_id: categoryIdUpdate }),
        current_stage: current_stage !== undefined ? (current_stage || null) : undefined,
        next_stage: next_stage !== undefined ? (next_stage || null) : undefined,
        estimated_duration: estimated_duration !== undefined ? (estimated_duration || null) : undefined,
        involved_agencies: involved_agencies !== undefined ? (involved_agencies || null) : undefined,
        common_mistakes: common_mistakes !== undefined ? (common_mistakes || null) : undefined,
        expert_level: expert_level !== undefined ? (expert_level || null) : undefined,
        timeline_steps: timeline_steps !== undefined ? (timeline_steps || null) : undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PUT] DB 업데이트 실패:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // DB에 실제로 반영됐는지 검증 (재조회)
    const { data: verifyData, error: verifyError } = await serviceSupabase
      .from("posts")
      .select("id, title, slug, updated_at, cover_image, published, published_at")
      .eq("id", id)
      .single();

    if (verifyError) {
      console.error("[PUT] DB 검증 조회 실패:", verifyError.message);
    } else {
      console.log("[PUT] DB 저장 검증:", {
        id: verifyData.id,
        title: verifyData.title,
        slug: verifyData.slug,
        published: verifyData.published,
        published_at: verifyData.published_at,
        updated_at: verifyData.updated_at,
        cover_image: verifyData.cover_image ? verifyData.cover_image.slice(0, 60) + "..." : null,
        content_length: data?.content?.length ?? 0,
      });
    }

    // 캐시 즉시 갱신 (수정 시)
    if (published) {
      revalidatePath("/", "page");
      revalidatePath("/posts", "page");
      revalidatePath(`/posts/${slug}`, "page");
      revalidatePath(`/posts/${slug}/*`, "page");
      revalidatePath("/tags", "page");
      revalidatePath("/situations", "page");
      revalidatePath("/cases", "page");
      revalidateTag("posts");
      revalidateTag(`post-${id}`);

      // IndexNow 알림 — await로 완료해 서버리스 종료 유실 방지
      if (process.env.INDEXNOW_KEY) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";
        const postUrl = `${siteUrl}/posts/${slug}`;
        const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        const idxResult = await notifyIndexNow([postUrl], process.env.INDEXNOW_KEY, host).catch((err) => {
          console.error("[IndexNow PUT] 네트워크 오류:", err?.message);
          return null;
        });
        if (idxResult?.success) console.log("[IndexNow PUT] 성공:", idxResult.message);
        else if (idxResult) console.error("[IndexNow PUT] 실패:", idxResult.message);
      }
    }

    // embedding 재생성 — 발행 상태 PUT은 본문이 바뀌므로 벡터도 항상 갱신해
    // 임베딩-콘텐츠 드리프트를 막는다. await로 완료(서버리스 종료 유실 방지).
    if (published && data?.id && process.env.OPENAI_API_KEY) {
      const stagePart = [current_stage, next_stage].filter(Boolean).join(" → ");
      const vec = await openaiEmbed(buildEmbeddingText(title, stagePart, excerpt, finalContent));
      if (vec) {
        const { error: embErr } = await serviceSupabase
          .from("posts")
          .update({ embedding: JSON.stringify(vec) })
          .eq("id", data.id);
        if (embErr) console.error("[embedding/post-update] DB 저장 실패:", embErr.message);
      } else {
        console.error("[embedding/post-update] 벡터 생성 실패");
      }
    }

    // process_embedding 재생성 — 동일하게 await
    if (published && data?.id && process.env.OPENAI_API_KEY && (current_stage || next_stage || (timeline_steps && timeline_steps.length > 0))) {
      const processText = [current_stage, next_stage, ...(timeline_steps || [])].filter(Boolean).join(" → ");
      const pvec = await openaiEmbed(processText.slice(0, 2000));
      if (pvec) {
        const { error: pErr } = await serviceSupabase
          .from("posts")
          .update({ process_embedding: JSON.stringify(pvec) })
          .eq("id", data.id);
        if (pErr) console.error("[process-embedding/post-update] DB 저장 실패:", pErr.message);
      }
    }

    // 캐시 즉시 갱신
    revalidatePath("/", "page");
    revalidatePath("/posts", "page");
    revalidatePath(`/posts/${slug}`, "page");
    // 슬러그가 변경된 경우 이전 슬러그도 무효화
    if (existingPost.slug && existingPost.slug !== slug) {
      revalidatePath(`/posts/${existingPost.slug}`, "page");
    }
    revalidatePath("/tags", "page");
    revalidatePath("/categories", "page");
    revalidatePath("/cases", "page");
    if (case_type) revalidatePath(`/cases/${encodeURIComponent(case_type)}`, "page");

    // IndexNow 알림 + situations_cache 갱신 (수정)
    if (published) {
      const { key, host } = getIndexNowConfig();
      if (key) {
        const siteUrl = `https://${host}`;
        notifyIndexNow([`${siteUrl}/posts/${encodeURIComponent(slug)}`, `${siteUrl}/posts`, siteUrl], key, host).catch(() => {});
      }
      refreshSituationsCache().catch(() => {});
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to update post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
