import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/comments/[id]/like - 좋아요 토글
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    // 이미 좋아요 했는지 확인
    const { data: existingLike } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", id)
      .eq("user_id", user_id)
      .single();

    if (existingLike) {
      // 좋아요 취소
      await supabase.from("comment_likes").delete().eq("id", existingLike.id);
      
      // 댓글 좋아요 수 감소
      await supabase
        .from("comments")
        .update({ like_count: supabase.raw("like_count - 1") })
        .eq("id", id);

      return NextResponse.json({ liked: false });
    } else {
      // 좋아요 추가
      await supabase.from("comment_likes").insert({
        comment_id: id,
        user_id,
      });

      // 댓글 좋아요 수 증가
      await supabase
        .from("comments")
        .update({ like_count: supabase.raw("like_count + 1") })
        .eq("id", id);

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("좋아요 처리 실패:", error);
    return NextResponse.json({ error: "좋아요 처리 실패" }, { status: 500 });
  }
}
