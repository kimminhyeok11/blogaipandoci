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

// 이미지 URL에서 슬러그 추출
function extractImageSlug(imageUrl: string): string | null {
  if (!imageUrl) return null;
  // Supabase storage URL에서 파일명 추출
  const match = imageUrl.match(/\/([^\/]+)\.(jpg|jpeg|png|webp|avif|gif)$/i);
  return match && match[1] ? match[1] : null;
}

// 제목에서 슬러그 추정
function estimateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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
          // 제목으로 슬러그 추정
          const suggestedPost = Array.from(titleToSlug.entries()).find(([title]) =>
            estimateSlugFromTitle(title) === linkSlug
          );
          issues.push({
            type: "internal_link",
            postId: post.id,
            postTitle: post.title,
            postSlug: post.slug,
            invalidSlug: linkSlug,
            suggestedSlug: suggestedPost ? suggestedPost[1] : undefined,
          });
        }
      }

      // 이미지 URL 검증
      const imageSlug = extractImageSlug(post.cover_image || "");
      if (imageSlug && !actualSlugs.has(imageSlug)) {
        // 이미지 파일명이 슬러그와 일치하지 않음
        const suggestedPost = Array.from(titleToSlug.entries()).find(([title]) =>
          estimateSlugFromTitle(title) === imageSlug
        );
        issues.push({
          type: "image_url",
          postId: post.id,
          postTitle: post.title,
          postSlug: post.slug,
          invalidSlug: imageSlug,
          suggestedSlug: suggestedPost ? suggestedPost[1] : undefined,
        });
      }
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
    const { postId, invalidSlug, suggestedSlug, type } = body;

    if (!postId || !invalidSlug || !suggestedSlug || !type) {
      return NextResponse.json({ error: "필수 파라미터 부족" }, { status: 400 });
    }

    // 글 조회
    const { data: post, error: postError } = await admin
      .from("posts")
      .select("id, content, cover_image")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("글 조회 실패");
    }

    let updatedContent = post.content;
    let updatedCoverImage = post.cover_image;

    // 내부 링크 재매칭
    if (type === "internal_link") {
      updatedContent = post.content.replace(
        new RegExp(`\\[([^\\]]+)\\]\\(\\/posts\\/${invalidSlug}\\)`, "g"),
        `[$1](/posts/${suggestedSlug})`
      );
    }

    // 이미지 URL 재매칭
    if (type === "image_url") {
      if (post.cover_image) {
        updatedCoverImage = post.cover_image.replace(
          new RegExp(`/${invalidSlug}\\.(jpg|jpeg|png|webp|avif|gif)$`, "i"),
          `/${suggestedSlug}.$1`
        );
      }
    }

    // DB 업데이트
    const updateData: any = {};
    if (type === "internal_link" && updatedContent !== post.content) {
      updateData.content = updatedContent;
    }
    if (type === "image_url" && updatedCoverImage !== post.cover_image) {
      updateData.cover_image = updatedCoverImage;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "변경사항 없음" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("posts")
      .update(updateData)
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
