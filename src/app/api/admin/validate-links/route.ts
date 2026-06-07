import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 내부 링크 추출 (마크다운 형식: [텍스트](/posts/slug))
function extractInternalLinks(content: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(\/posts\/([^)]+)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    if (match[2]) {
      links.push(match[2]); // slug 추출
    }
  }
  return links;
}

// 이미지 URL 검증 제거 (cover_image는 게시물 슬러그와 관계 없음)
// 이미지 URL은 별도 검증 불필요

// 제목에서 슬러그 추정 (더 정확한 매칭)
function estimateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// 제목으로 슬러그 찾기 (유사도 기반)
function findSlugByTitle(
  title: string,
  titleToSlug: Map<string, string>,
  categoryNameToSlug?: Map<string, string>
): string | null {
  // 정확히 일치하는 제목 찾기
  if (titleToSlug.has(title)) {
    return titleToSlug.get(title) || null;
  }

  // 카테고리 name-slug 매핑에서 찾기 (cases/ 형식의 링크용)
  if (categoryNameToSlug && categoryNameToSlug.has(title)) {
    return categoryNameToSlug.get(title)!;
  }

  // 슬러그 추정으로 찾기
  const estimatedSlug = estimateSlugFromTitle(title);
  const exactMatch = Array.from(titleToSlug.entries()).find(([_, slug]) => slug === estimatedSlug);
  if (exactMatch) {
    return exactMatch[1];
  }

  // 부분 일치 찾기 (제목의 일부가 포함된 경우)
  const partialMatch = Array.from(titleToSlug.entries()).find(([t]) =>
    t.includes(title) || title.includes(t)
  );
  if (partialMatch) {
    return partialMatch[1];
  }

  // 카테고리 부분 일치 찾기
  if (categoryNameToSlug) {
    const categoryPartialMatch = Array.from(categoryNameToSlug.entries()).find(([t]) =>
      t.includes(title) || title.includes(t)
    );
    if (categoryPartialMatch) {
      return categoryPartialMatch[1];
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const admin = makeAdmin();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    // 모든 발행된 글 조회
    const { data: posts, error: postsError } = await admin
      .from("posts")
      .select("id, title, slug, content, cover_image")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (postsError || !posts) {
      throw new Error("글 조회 실패");
    }

    // 카테고리 조회 (cases/ 형식의 링크 검증용)
    const { data: categories, error: categoriesError } = await admin
      .from("categories")
      .select("name, slug")
      .eq("is_active", true);

    if (categoriesError) {
      console.error("카테고리 조회 오류:", categoriesError);
    }

    // 실제 슬러그 목록
    const actualSlugs = new Map<string, { id: string; title: string }>();
    posts.forEach(post => {
      actualSlugs.set(post.slug, { id: post.id, title: post.title });
    });

    // 제목-슬러그 매핑 (슬러그 추정용)
    const titleToSlug = new Map<string, string>();
    posts.forEach(post => {
      titleToSlug.set(post.title, post.slug);
    });

    // 카테고리 name-slug 매핑 (cases/ 형식의 링크 검증용)
    const categoryNameToSlug = new Map<string, string>();
    (categories || []).forEach(cat => {
      categoryNameToSlug.set(cat.name, cat.slug);
    });

    const issues: Array<{
      type: "internal_link" | "image_url";
      postId: string;
      postTitle: string;
      postSlug: string;
      invalidSlug: string;
      suggestedSlug?: string;
    }> = [];

    // 각 글 검증
    for (const post of posts) {
      // 내부 링크 검증
      const internalLinks = extractInternalLinks(post.content || "");
      for (const linkSlug of internalLinks) {
        if (!actualSlugs.has(linkSlug)) {
          // 슬러그가 존재하지 않음
          // 제목으로 슬러그 찾기 (유사도 기반)
          const suggestedSlug = findSlugByTitle(linkSlug, titleToSlug, categoryNameToSlug);
          issues.push({
            type: "internal_link",
            postId: post.id,
            postTitle: post.title,
            postSlug: post.slug,
            invalidSlug: linkSlug,
            suggestedSlug: suggestedSlug || undefined,
          });
        }
      }

      // 이미지 URL 검증 제거 (cover_image는 게시물 슬러그와 관계 없음)
    }

    return NextResponse.json({
      totalPosts: posts.length,
      issues,
      issueCount: issues.length,
    });
  } catch (error) {
    console.error("링크 검증 실패:", error);
    return NextResponse.json(
      { error: "링크 검증 실패" },
      { status: 500 }
    );
  }
}

// POST /api/admin/validate-links - 자동 재매칭
export async function POST(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const admin = makeAdmin();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    const body = await request.json();
    const { postId, invalidSlug, suggestedSlug } = body;

    if (!postId || !invalidSlug || !suggestedSlug) {
      return NextResponse.json({ error: "필수 파라미터 부족" }, { status: 400 });
    }

    // 글 조회
    const { data: post, error: postError } = await admin
      .from("posts")
      .select("id, content")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("글 조회 실패");
    }

    // 내부 링크 재매칭 (/posts/ 형식)
    let updatedContent = post.content.replace(
      new RegExp(`\\[([^\\]]+)\\]\\(\\/posts\\/${invalidSlug}\\)`, "g"),
      `[$1](/posts/${suggestedSlug})`
    );

    // 내부 링크 재매칭 (/cases/ 형식)
    updatedContent = updatedContent.replace(
      new RegExp(`\\[([^\\]]+)\\]\\(\\/cases\\/${invalidSlug}\\)`, "g"),
      `[$1](/cases/${suggestedSlug})`
    );

    if (updatedContent === post.content) {
      return NextResponse.json({ error: "변경사항 없음" }, { status: 400 });
    }

    // DB 업데이트
    const { error: updateError } = await admin
      .from("posts")
      .update({ content: updatedContent })
      .eq("id", postId);

    if (updateError) {
      throw new Error("DB 업데이트 실패");
    }

    // 캐시 갱신
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/posts", "page");
    revalidatePath(`/posts/${post.id}`, "page");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("재매칭 실패:", error);
    return NextResponse.json(
      { error: "재매칭 실패" },
      { status: 500 }
    );
  }
}
