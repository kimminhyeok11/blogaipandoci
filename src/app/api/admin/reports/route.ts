import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/admin/reports - 신고 목록 조회
export async function GET(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

  const supabaseAdmin = makeAdmin();
  const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  let reportsQuery = supabaseAdmin
    .from("comment_reports")
    .select(`
      id,
      reason,
      status,
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

  if (status && status !== "all") {
    reportsQuery = reportsQuery.eq("status", status);
  }

  const { data, error } = await reportsQuery;

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
