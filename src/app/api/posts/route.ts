import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/supabase";

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

    const userId = authHeader.replace("Bearer ", "");
    const body = await request.json();
    const { title, slug, content, excerpt, cover_image, cover_image_alt, published, user_id } = body;

    // Verify user matches
    if (userId !== user_id) {
      return NextResponse.json(
        { error: "Forbidden - User mismatch" },
        { status: 403 }
      );
    }

    const serviceSupabase = getServiceSupabase();

    const { data, error } = await serviceSupabase
      .from("posts")
      .insert({
        title,
        slug,
        content,
        excerpt,
        cover_image,
        cover_image_alt,
        published,
        user_id: userId,
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

    const userId = authHeader.replace("Bearer ", "");
    const body = await request.json();
    const { id, title, slug, content, excerpt, cover_image, cover_image_alt, published } = body;

    const serviceSupabase = getServiceSupabase();

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

    if (existingPost.user_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - Not your post" },
        { status: 403 }
      );
    }

    const { data, error } = await serviceSupabase
      .from("posts")
      .update({
        title,
        slug,
        content,
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

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to update post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
