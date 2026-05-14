import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/admin/comments - 관리자용 댓글 목록
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    let query = supabaseAdmin
      .from("comments")
      .select(`
        *,
        post:posts(title, slug),
        user:users(nickname, email)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // 필터 적용
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error("댓글 로드 실패:", error);
    return NextResponse.json({ error: "댓글 로드 실패" }, { status: 500 });
  }
}
