import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// PUT /api/admin/comments/[id]/approve - 댓글 승인
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from("comments")
      .update({ status: "public" })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("승인 실패:", error);
    return NextResponse.json({ error: "승인 실패" }, { status: 500 });
  }
}
