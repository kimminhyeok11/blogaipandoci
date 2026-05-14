import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { maskPII } from "@/lib/pii-mask";

// PUT /api/comments/[id] - 댓글 수정
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { content, user_id } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "내용 필수" }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    // 기존 댓글 조회
    const { data: existingComment, error: fetchError } = await supabaseAdmin
      .from("comments")
      .select("content, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }

    // 본인 확인
    if (existingComment.user_id && existingComment.user_id !== user_id) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const maskedContent = maskPII(content);

    // 수정 기록 저장
    await supabaseAdmin.from("comment_history").insert({
      comment_id: id,
      old_content: existingComment.content,
      new_content: maskedContent,
      edited_by: user_id,
    });

    // 댓글 수정
    const { data: comment, error: updateError } = await supabaseAdmin
      .from("comments")
      .update({
        content: maskedContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("댓글 수정 실패:", error);
    return NextResponse.json({ error: "댓글 수정 실패" }, { status: 500 });
  }
}

// DELETE /api/comments/[id] - 댓글 소프트 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { user_id } = await request.json();

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    // 본인 확인 또는 관리자 확인
    const { data: comment } = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }

    // 관리자 확인
    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user_id)
      .single();

    const isAdmin = adminUser?.role === "admin";
    const isOwner = comment.user_id === user_id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    // 소프트 삭제
    const { error } = await supabaseAdmin
      .from("comments")
      .update({
        deleted_at: new Date().toISOString(),
        status: "deleted",
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("댓글 삭제 실패:", error);
    return NextResponse.json({ error: "댓글 삭제 실패" }, { status: 500 });
  }
}
