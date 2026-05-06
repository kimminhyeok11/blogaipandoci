import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// POST /api/tags - 태그 생성 및 게시글 연결
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authHeader.replace("Bearer ", "");
    const body = await request.json();
    const { postId, tags } = body;

    if (!postId || !Array.isArray(tags)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();

    // 기존 태그 연결 삭제
    await (serviceSupabase.from("post_tags") as any)
      .delete()
      .eq("post_id", postId);

    // 태그 저장
    for (const tagName of tags) {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-");
      
      // 태그 조회 또는 생성
      let { data: existingTag } = await (serviceSupabase.from("tags") as any)
        .select("id")
        .eq("slug", slug)
        .single();

      let tagId;
      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagError } = await (serviceSupabase.from("tags") as any)
          .insert({ name: tagName, slug })
          .select("id")
          .single();
        
        if (tagError) throw tagError;
        tagId = newTag.id;
      }

      // 게시글-태그 연결
      await (serviceSupabase.from("post_tags") as any).insert({
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

    const serviceSupabase = getServiceSupabase();

    const { data, error } = await (serviceSupabase.from("post_tags") as any)
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
