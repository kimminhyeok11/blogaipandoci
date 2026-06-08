import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { notifyIndexNow } from "@/lib/indexnow";
import { refreshSituationsCache } from "@/lib/situations";
import { addInternalLinks, getCachedKeywords } from "@/lib/internal-links";

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
async function findRelatedPosts(
  serviceSupabase: any,
  title: string,
  excludeSlug: string,
  maxCount: number = 5
): Promise<{ title: string; slug: string }[]> {
  try {
    // OpenAI API 키가 없으면 기존 방식 사용
    if (!process.env.OPENAI_API_KEY) {
      return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
    }

    // 현재 제목 embedding 생성
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: title }),
    });

    if (!embeddingResponse.ok) {
      console.error("Embedding 생성 실패, 기존 방식 사용");
      return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
    }

    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData?.data?.[0]?.embedding;

    if (!Array.isArray(queryVector) || queryVector.length !== 1536) {
      console.error("잘못된 벡터 차원, 기존 방식 사용");
      return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
    }

    // embedding이 있는 글들 조회
    const { data: posts, error } = await serviceSupabase
      .from('posts')
      .select('title, slug, embedding')
      .eq('published', true)
      .not('published_at', 'is', null)
      .neq('slug', excludeSlug)
      .not('embedding', 'is', null)
      .order('published_at', { ascending: false })
      .limit(200);

    if (error || !posts || posts.length === 0) {
      return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
    }

    // 코사인 유사도 계산
    const scored = posts
      .map((post: any) => {
        try {
          const embedding = JSON.parse(post.embedding);
          if (!Array.isArray(embedding) || embedding.length !== 1536) return null;

          const similarity = cosineSimilarity(queryVector, embedding);
          return { ...post, score: similarity };
        } catch {
          return null; // JSON 파싱 실패 시 null 반환
        }
      })
      .filter((p: any) => p !== null && p.score >= 0.5) // 유사도 0.5 이상만
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, maxCount)
      .map(({ title, slug }: any) => ({ title, slug }));

    return scored.length > 0 ? scored : findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
  } catch (err) {
    console.error('벡터 검색 실패, 기존 방식 사용:', err);
    return findRelatedPostsByTitle(serviceSupabase, title, excludeSlug, maxCount);
  }
}

// 코사인 유사도 계산
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
function injectInlineLinks(content: string, relatedPosts: { title: string; slug: string }[], currentSlug: string): string {
  if (relatedPosts.length === 0) return content;

  // 자기글 제외
  const filteredPosts = relatedPosts.filter(post => post.slug !== currentSlug);
  if (filteredPosts.length === 0) return content;

  // 코드블록 위치 수집 (링크 삽입 제외 구간)
  const codeBlockRanges: [number, number][] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRegex.exec(content)) !== null) {
    codeBlockRanges.push([m.index, m.index + m[0].length]);
  }
  const isInCodeBlock = (idx: number) => codeBlockRanges.some(([s, e]) => idx >= s && idx < e);

  // 이미 링크된 구간 수집 ([text](url) 형태)
  const linkedRanges: [number, number][] = [];
  const linkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  while ((m = linkRegex.exec(content)) !== null) {
    linkedRanges.push([m.index, m.index + m[0].length]);
  }
  const isAlreadyLinked = (idx: number) => linkedRanges.some(([s, e]) => idx >= s && idx < e);

  // 헤딩 라인 위치 수집
  const headingRanges: [number, number][] = [];
  const headingRegex = /^#{1,6} .+$/gm;
  while ((m = headingRegex.exec(content)) !== null) {
    headingRanges.push([m.index, m.index + m[0].length]);
  }
  const isInHeading = (idx: number) => headingRanges.some(([s, e]) => idx >= s && idx < e);

  const isExcluded = (idx: number) => isInCodeBlock(idx) || isAlreadyLinked(idx) || isInHeading(idx);

  let result = content;
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

      const keywordIdx = result.indexOf(keyword);
      if (keywordIdx === -1) continue;
      if (isExcluded(keywordIdx)) continue;

      // 첫 번째 등장 위치에만 링크 삽입 (마크다운 형식)
      result =
        result.slice(0, keywordIdx) +
        `[${keyword}](/posts/${post.slug})` +
        result.slice(keywordIdx + keyword.length);

      usedKeywords.add(keyword);
      injected = true;
      break; // 글당 1개 키워드만
    }
    // 최대 3개 글만 인라인 링크 삽입 (과도한 링크 방지)
    if (usedKeywords.size >= 3) break;
    void injected;
  }

  return result;
}

// 본문 하단에 관련 글 링크 마크다운 삽입 + 본문 인라인 링크 삽입
// 이전 발행 시 삽입된 인라인 내부 링크 제거 (재발행 시 최신 슬러그로 교체하기 위해)
function removeInjectedInlineLinks(content: string): string {
  // 마크다운 [키워드](/posts/슬러그) 형태의 링크를 키워드 텍스트로만 복원
  return content.replace(/\[([^\]]+)\]\(\/posts\/[^)]+\)/g, '$1');
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

  // 본문 인라인 링크 삽입 (자기글 제외)
  const withInline = injectInlineLinks(unlinked, relatedPosts, currentSlug);

  const links = relatedPosts
    .map(p => `- [${p.title}](/posts/${p.slug})`)
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

    // 토큰으로 user_id 결정 — body.user_id 우회 차단
    const { data: { user: authUser } } = await serviceSupabase.auth.getUser(token);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

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

      // 제목 유사도 기반 관련 글 섹션 추가 (마크다운 형식)
      const relatedPosts = await findRelatedPosts(serviceSupabase, title, finalSlug);
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

    // embedding 생성 (비동기, 발행 시에만)
    if (published && data?.id && process.env.OPENAI_API_KEY) {
      const stagePart = [current_stage, next_stage].filter(Boolean).join(" → ");
      const embeddingText = [
        title,
        stagePart,
        excerpt || "",
        finalContent.replace(/[#*`\[\]()!]/g, "").slice(0, 5500),
      ].filter(Boolean).join(" ");
      fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: embeddingText.slice(0, 8000) }),
      }).then(r => r.json()).then(embRes => {
        if (embRes?.error) {
          console.error("[embedding/post] OpenAI 오류:", embRes.error.message);
          return;
        }
        const vec = embRes?.data?.[0]?.embedding;
        if (!Array.isArray(vec) || vec.length !== 1536) {
          console.error("[embedding/post] 잘못된 벡터 차원:", vec?.length);
          return;
        }
        serviceSupabase.from("posts").update({ embedding: JSON.stringify(vec) }).eq("id", data.id)
          .then(({ error: dbErr }) => { if (dbErr) console.error("[embedding/post] DB 저장 실패:", dbErr.message); });
      }).catch((err) => { console.error("[embedding/post] 네트워크 오류:", err?.message); });
    }

    // IndexNow 알림 (비동기, 발행 시에만)
    if (published && data?.id && process.env.INDEXNOW_KEY) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";
      const postUrl = `${siteUrl}/posts/${finalSlug}`;
      
      fetch(`${siteUrl}/api/indexnow-notify`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: [postUrl] }),
      }).then(r => r.json()).then(indexNowRes => {
        if (indexNowRes.success) {
          console.log("[IndexNow] 성공:", indexNowRes.message);
        } else {
          console.error("[IndexNow] 실패:", indexNowRes.message);
        }
      }).catch((err) => { console.error("[IndexNow] 네트워크 오류:", err?.message); });
    }

    // process_embedding 생성 (절차 데이터가 있을 때만)
    if (published && data?.id && process.env.OPENAI_API_KEY && (current_stage || next_stage || (timeline_steps && timeline_steps.length > 0))) {
      const processText = [
        current_stage,
        next_stage,
        ...(timeline_steps || []),
      ].filter(Boolean).join(" → ");
      fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: processText.slice(0, 2000) }),
      }).then(r => r.json()).then(pEmbRes => {
        if (pEmbRes?.error) return;
        const pvec = pEmbRes?.data?.[0]?.embedding;
        if (!Array.isArray(pvec) || pvec.length !== 1536) return;
        serviceSupabase.from("posts").update({ process_embedding: JSON.stringify(pvec) }).eq("id", data.id)
          .then(({ error: dbErr }) => { if (dbErr) console.error("[process-embedding/post] DB 저장 실패:", dbErr.message); });
      }).catch(() => {});
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

      // IndexNow 알림 (신규 발행)
      const { key, host } = getIndexNowConfig();
      if (key) {
        const siteUrl = `https://${host}`;
        notifyIndexNow([`${siteUrl}/posts/${encodeURIComponent(finalSlug)}`, `${siteUrl}/posts`, siteUrl], key, host).catch(() => {});
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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('[PUT] Service key exists:', !!serviceKey);
    console.log('[PUT] Token starts with:', token.substring(0, 20));
    console.log('[PUT] Service key starts with:', serviceKey?.substring(0, 20));
    const isServiceKey = token === serviceKey;
    console.log('[PUT] Is service key:', isServiceKey);
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
        const relatedPosts = await findRelatedPosts(serviceSupabase, title, slug);
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

      // IndexNow 알림 (비동기, 발행 시에만)
      if (process.env.INDEXNOW_KEY) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";
        const postUrl = `${siteUrl}/posts/${slug}`;
        const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        
        notifyIndexNow([postUrl], process.env.INDEXNOW_KEY, host).then(result => {
          if (result.success) {
            console.log("[IndexNow PUT] 성공:", result.message);
          } else {
            console.error("[IndexNow PUT] 실패:", result.message);
          }
        }).catch((err) => { console.error("[IndexNow PUT] 네트워크 오류:", err?.message); });
      }
    }

    // embedding 재생성 (비동기, 발행 상태일 때만, 기존 벡터가 없을 때만)
    if (published && data?.id && process.env.OPENAI_API_KEY) {
      // 기존 벡터 확인
      const { data: existingPost } = await serviceSupabase
        .from("posts")
        .select("embedding")
        .eq("id", data.id)
        .single();

      // 기존 벡터가 없을 때만 생성
      if (!existingPost?.embedding) {
        const stagePart = [current_stage, next_stage].filter(Boolean).join(" → ");
        const embeddingText = [
          title,
          stagePart,
          excerpt || "",
          finalContent.replace(/[#*`\[\]()!]/g, "").slice(0, 5500),
        ].filter(Boolean).join(" ");
        fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: "text-embedding-3-small", input: embeddingText.slice(0, 8000) }),
        }).then(r => r.json()).then(embRes => {
          if (embRes?.error) {
            console.error("[embedding/post-update] OpenAI 오류:", embRes.error.message);
            return;
          }
          const vec = embRes?.data?.[0]?.embedding;
          if (!Array.isArray(vec) || vec.length !== 1536) {
            console.error("[embedding/post-update] 잘못된 벡터 차원:", vec?.length);
            return;
          }
          serviceSupabase.from("posts").update({ embedding: JSON.stringify(vec) }).eq("id", data.id)
            .then(({ error: dbErr }) => { if (dbErr) console.error("[embedding/post-update] DB 저장 실패:", dbErr.message); });
        }).catch((err) => { console.error("[embedding/post-update] 네트워크 오류:", err?.message); });
      } else {
        console.log("[embedding/post-update] 기존 벡터가 있어서 재생성하지 않음");
      }
    }

    // process_embedding 재생성
    if (published && data?.id && process.env.OPENAI_API_KEY && (current_stage || next_stage || (timeline_steps && timeline_steps.length > 0))) {
      const processText = [
        current_stage,
        next_stage,
        ...(timeline_steps || []),
      ].filter(Boolean).join(" → ");
      fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: processText.slice(0, 2000) }),
      }).then(r => r.json()).then(pEmbRes => {
        if (pEmbRes?.error) return;
        const pvec = pEmbRes?.data?.[0]?.embedding;
        if (!Array.isArray(pvec) || pvec.length !== 1536) return;
        serviceSupabase.from("posts").update({ process_embedding: JSON.stringify(pvec) }).eq("id", data.id)
          .then(({ error: dbErr }) => { if (dbErr) console.error("[process-embedding/post-update] DB 저장 실패:", dbErr.message); });
      }).catch(() => {});
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
