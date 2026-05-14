import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/admin/comments/export - 댓글 내보내기
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

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
