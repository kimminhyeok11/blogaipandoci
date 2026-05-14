import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { maskPII } from "@/lib/pii-mask";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyToken(request: Request): Promise<{ userId: string | null; role: string | null }> {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return { userId: null, role: null };
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error } = await anon.auth.getUser(token);
    if (error || !user) return { userId: null, role: null };
    const { data: profile } = await makeAdmin().from("users").select("role").eq("id", user.id).single();
    return { userId: user.id, role: profile?.role ?? "user" };
  } catch {
    return { userId: null, role: null };
  }
}

// PUT /api/comments/[id] - 댓글 수정
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { userId, role } = await verifyToken(request);
    if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "내용 필수" }, { status: 400 });
    }

    const supabaseAdmin = makeAdmin();

    const { data: existingComment, error: fetchError } = await supabaseAdmin
      .from("comments")
      .select("content, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }

    // 본인 또는 관리자만 수정 가능
    if (existingComment.user_id !== userId && role !== "admin") {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const maskedContent = maskPII(content);

    // 수정 기록 저장
    await supabaseAdmin.from("comment_history").insert({
      comment_id: id,
      old_content: existingComment.content,
      new_content: maskedContent,
      edited_by: userId,
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
    const { userId, role } = await verifyToken(request);
    if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const supabaseAdmin = makeAdmin();

    const { data: comment } = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }

    const isAdmin = role === "admin";
    const isOwner = comment.user_id === userId;

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
