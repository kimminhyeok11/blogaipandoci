import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/comments/[id]/report - 신고
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { reporter_id, reason } = await request.json();

    if (!reason) {
      return NextResponse.json({ error: "신고 사유 필수" }, { status: 400 });
    }

    // 이미 신고했는지 확인
    const { data: existingReport } = await supabase
      .from("comment_reports")
      .select("id")
      .eq("comment_id", id)
      .eq("reporter_id", reporter_id)
      .single();

    if (existingReport) {
      return NextResponse.json({ error: "이미 신고했습니다" }, { status: 400 });
    }

    // 신고 등록
    const { error } = await supabase.from("comment_reports").insert({
      comment_id: id,
      reporter_id: reporter_id || null,
      reason,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("신고 실패:", error);
    return NextResponse.json({ error: "신고 실패" }, { status: 500 });
  }
}
