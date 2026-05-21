import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { notifyIndexNow } from "@/lib/indexnow";
import { refreshSituationsCache } from "@/lib/situations";

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

// 관련 글 찾기: 제목 유사도 기반
async function findRelatedPosts(
  serviceSupabase: any,
  title: string,
  excludeSlug: string,
  maxCount: number = 5
): Promise<{ title: string; slug: string }[]> {
  try {
    // 기존 발행된 글 전체 조회
    const { data: posts, error } = await serviceSupabase
      .from('posts')
      .select('title, slug')
      .eq('published', true)
      .not('published_at', 'is', null)
      .neq('slug', excludeSlug)
      .order('published_at', { ascending: false })
      .limit(200);

    if (error || !posts || posts.length === 0) return [];

    // 각 글에 대해 제목 유사도 계산
    const scored = posts.map((post: any) => {
      const similarity = calculateTitleSimilarity(title, post.title || '');
      return { ...post, score: similarity };
    });

    // 유사도 높은 순 정렬, 최소 0.1 이상 매칭된 것만
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
function injectInlineLinks(content: string, relatedPosts: { title: string; slug: string }[]): string {
  if (relatedPosts.length === 0) return content;

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
  for (const post of relatedPosts) {
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

      // 첫 번째 등장 위치에만 링크 삽입
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
function appendRelatedLinks(content: string, relatedPosts: { title: string; slug: string }[]): string {
  if (relatedPosts.length === 0) return content;

  // 기존에 관련 글 섹션이 있으면 제거 (재발행 시 중복 방지)
  const cleaned = content.replace(/\n---\n\n### 📌 관련 글\n[\s\S]*$/, '');

  // 본문 인라인 링크 삽입
  const withInline = injectInlineLinks(cleaned, relatedPosts);

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

      const { data: profile } = await serviceSupabase.from("users").select("role").eq("id", authUser.id).single();
      if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

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

    return NextResponse.json({ posts: data, count });
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
    const { data: profile } = await serviceSupabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - 관리자만 글을 작성할 수 있습니다" }, { status: 403 });
    }

    // slug 중복 확인 후 자동 suffix 추가
    let finalSlug = slug;
    const { data: existing } = await serviceSupabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      finalSlug = `${slug.slice(0, 20)}-${Date.now().toString(36).slice(-4)}`;
    }

    // 발행 시 관련 글 자동 삽입
    let finalContent = content;
    if (published) {
      const relatedPosts = await findRelatedPosts(serviceSupabase, title, finalSlug);
      finalContent = appendRelatedLinks(content, relatedPosts);
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
      revalidatePath("/");
      revalidatePath("/posts");
      revalidatePath(`/posts/${finalSlug}`);
      revalidatePath("/tags");
      revalidatePath("/categories");
      revalidatePath("/cases");
      if (case_type) revalidatePath(`/cases/${encodeURIComponent(case_type)}`);

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

    // 토큰으로 실제 유저 확인 + 관리자 체크
    const { data: { user: authUser } } = await serviceSupabase.auth.getUser(token);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await serviceSupabase
      .from("users").select("role").eq("id", authUser.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - 관리자만 글을 수정할 수 있습니다" }, { status: 403 });
    }

    // Check if user owns this post
    const { data: existingPost, error: fetchError } = await serviceSupabase
      .from("posts")
      .select("user_id, published_at, published")
      .eq("id", id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== authUser.id) {
      return NextResponse.json(
        { error: "Forbidden - Not your post" },
        { status: 403 }
      );
    }

    // 발행 시 관련 글 자동 삽입 (수정 시에도 갱신)
    let finalContent = content;
    if (published) {
      const relatedPosts = await findRelatedPosts(serviceSupabase, title, slug);
      finalContent = appendRelatedLinks(content, relatedPosts);
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
      console.error("Failed to update post:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // embedding 재생성 (비동기, 발행 상태일 때만)
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
    revalidatePath("/");
    revalidatePath("/posts");
    revalidatePath(`/posts/${slug}`);
    revalidatePath("/tags");
    revalidatePath("/categories");
    revalidatePath("/cases");
    if (case_type) revalidatePath(`/cases/${encodeURIComponent(case_type)}`);

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
