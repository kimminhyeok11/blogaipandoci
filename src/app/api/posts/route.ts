import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase, getServiceSupabase } from "@/lib/supabase";
import { notifyIndexNow } from "@/lib/indexnow";

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

// 본문 하단에 관련 글 링크 마크다운 삽입
function appendRelatedLinks(content: string, relatedPosts: { title: string; slug: string }[]): string {
  if (relatedPosts.length === 0) return content;

  // 기존에 관련 글 섹션이 있으면 제거 (재발행 시 중복 방지)
  const cleaned = content.replace(/\n---\n\n### 📌 관련 글\n[\s\S]*$/, '');

  const links = relatedPosts
    .map(p => `- [${p.title}](/posts/${p.slug})`)
    .join('\n');

  return `${cleaned.trimEnd()}\n\n---\n\n### 📌 관련 글\n${links}\n`;
}

// GET /api/posts - 글 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // TODO: 태그 필터링 구현 (post_tags 테이블 조인 필요)
    // 현재 tag 파라미터는 무시됨

    const { data, error, count } = await query;

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
    const { title, slug, content, excerpt, cover_image, cover_image_alt, published, user_id } = body;

    const serviceSupabase = getServiceSupabase();

    // 토큰으로 실제 유저 확인
    const { data: { user: authUser } } = await serviceSupabase.auth.getUser(token);
    if (!authUser || authUser.id !== user_id) {
      return NextResponse.json({ error: "Forbidden - User mismatch" }, { status: 403 });
    }

    // 관리자만 글 작성 가능
    const { data: profile } = await serviceSupabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - 관리자만 글을 작성할 수 있습니다" }, { status: 403 });
    }

    // 발행 시 관련 글 자동 삽입
    let finalContent = content;
    if (published) {
      const relatedPosts = await findRelatedPosts(serviceSupabase, title, slug);
      finalContent = appendRelatedLinks(content, relatedPosts);
    }

    const { data, error } = await serviceSupabase
      .from("posts")
      .insert({
        title,
        slug,
        content: finalContent,
        excerpt,
        cover_image,
        cover_image_alt,
        published,
        user_id: user_id,
        published_at: published ? new Date().toISOString() : null,
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

    // 캐시 즉시 갱신
    if (published) {
      revalidatePath("/");
      revalidatePath("/posts");
      revalidatePath(`/posts/${slug}`);
      revalidatePath("/tags");
      revalidatePath("/categories");

      // IndexNow 알림 (신규 발행)
      const { key, host } = getIndexNowConfig();
      if (key) {
        const siteUrl = `https://${host}`;
        notifyIndexNow([`${siteUrl}/posts/${encodeURIComponent(slug)}`, `${siteUrl}/posts`, siteUrl], key, host).catch(() => {});
      }
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
    const { id, title, slug, content, excerpt, cover_image, cover_image_alt, published } = body;

    const serviceSupabase = getServiceSupabase();

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
      .select("user_id")
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
        cover_image,
        cover_image_alt,
        published,
        published_at: published ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
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

    // 캐시 즉시 갱신
    revalidatePath("/");
    revalidatePath("/posts");
    revalidatePath(`/posts/${slug}`);
    revalidatePath("/tags");
    revalidatePath("/categories");

    // IndexNow 알림 (수정)
    if (published) {
      const { key, host } = getIndexNowConfig();
      if (key) {
        const siteUrl = `https://${host}`;
        notifyIndexNow([`${siteUrl}/posts/${encodeURIComponent(slug)}`, `${siteUrl}/posts`, siteUrl], key, host).catch(() => {});
      }
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
