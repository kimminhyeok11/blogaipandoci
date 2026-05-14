import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/admin/reports - 신고 목록 조회
export async function GET(request: Request) {
  const supabaseAdmin = getServiceSupabase();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabaseAdmin
    .from("comment_reports")
    .select(`
      id,
      reason,
      created_at,
      reporter:users!reporter_id(nickname, email),
      comment:comments!comment_id(
        id,
        content,
        nickname,
        status,
        post:posts(title, slug)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  // 댓글 기준으로 신고 그룹화
  const grouped: Record<string, any> = {};
  for (const report of data || []) {
    const commentId = (report.comment as any)?.id;
    if (!commentId) continue;
    if (!grouped[commentId]) {
      grouped[commentId] = {
        comment: report.comment,
        reports: [],
        latestAt: report.created_at,
      };
    }
    grouped[commentId].reports.push({
      id: report.id,
      reason: report.reason,
      created_at: report.created_at,
      reporter: report.reporter,
    });
  }

  const result = Object.values(grouped).sort(
    (a: any, b: any) => b.reports.length - a.reports.length
  );

  return NextResponse.json({ reports: result });
}
