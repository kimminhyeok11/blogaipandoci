import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/tags - 태그 생성 및 게시글 연결
export async function POST(request: Request) {
  try {
    const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 실제 토큰 검증
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: authUser }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { postId, tags } = body;

    if (!postId || !Array.isArray(tags)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const serviceSupabase = makeAdmin();

    // 글 소유자 확인
    const { data: post, error: postErr } = await serviceSupabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();
    if (postErr || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.user_id !== authUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 기존 태그 연결 삭제
    await serviceSupabase
      .from("post_tags")
      .delete()
      .eq("post_id", postId);

    // 태그 저장
    for (const tagName of tags) {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-");
      
      // 태그 조회 또는 생성
      let { data: existingTag } = await serviceSupabase
        .from("tags")
        .select("id")
        .eq("slug", slug)
        .single();

      let tagId;
      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagError } = await serviceSupabase
          .from("tags")
          .insert({ name: tagName, slug })
          .select("id")
          .single();
        
        if (tagError) throw tagError;
        tagId = newTag.id;
      }

      // 게시글-태그 연결
      await serviceSupabase.from("post_tags").insert({
        post_id: postId,
        tag_id: tagId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save tags:", error);
    return NextResponse.json({ error: "Failed to save tags" }, { status: 500 });
  }
}

// GET /api/tags?postId=xxx - 게시글 태그 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const serviceSupabase = makeAdmin();

    const { data, error } = await serviceSupabase
      .from("post_tags")
      .select("tags(name)")
      .eq("post_id", postId);

    if (error) throw error;

    const tagNames = data.map((item: any) => item.tags.name);
    return NextResponse.json({ tags: tagNames });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
