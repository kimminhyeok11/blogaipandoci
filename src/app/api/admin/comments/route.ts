import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// GET /api/admin/comments - 관리자용 댓글 목록
export async function GET(request: Request) {
  try {
    // 관리자 인증 확인
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

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
