import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// GET /api/admin/comments/export - 댓글 내보내기
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
    const format = searchParams.get("format") || "json";

    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        post:posts(title, slug),
        user:users(nickname, email)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (format === "csv") {
      const csvHeader = "comment_id,post_title,post_slug,nickname,content,status,risk_score,question_type,topic_tags,like_count,reply_count,created_at\n";
      const csvRows = (comments || []).map((c: any) => 
        `${c.id},"${c.post?.title || ""}","${c.post?.slug || ""}","${c.nickname || ""}","${c.content.replace(/"/g, '""')}",${c.status},${c.risk_score},"${c.question_type || ""}","${c.topic_tags?.join(",") || ""}",${c.like_count},${c.reply_count},${c.created_at}`
      ).join("\n");
      
      return new Response(csvHeader + csvRows, {
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error("내보내기 실패:", error);
    return NextResponse.json({ error: "내보내기 실패" }, { status: 500 });
  }
}
