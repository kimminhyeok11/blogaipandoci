import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// DELETE /api/posts/[id] - 글 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authHeader.replace("Bearer ", "");
    const { id } = params;

    const serviceSupabase = getServiceSupabase();

    // Check ownership
    const { data: post, error: fetchError } = await (serviceSupabase.from("posts") as any)
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete post (cascade will handle post_tags)
    const { error } = await (serviceSupabase.from("posts") as any)
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
