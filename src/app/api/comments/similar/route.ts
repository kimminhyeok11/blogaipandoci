import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/comments/similar - 유사 사례 추천
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentPostId = searchParams.get("post_id");
    const questionType = searchParams.get("question_type");
    const topicTags = searchParams.get("topic_tags");

    if (!currentPostId) {
      return NextResponse.json({ error: "post_id 필수" }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    let query = supabaseAdmin
      .from("comments")
      .select(`
        *,
        post:posts(title, slug),
        user:users(nickname)
      `)
      .eq("status", "public")
      .neq("post_id", currentPostId)
      .is("deleted_at", null)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);

    // 태그 기반 필터
    if (topicTags) {
      const tagsArray = topicTags.split(",");
      query = query.contains("topic_tags", tagsArray);
    }

    // 질문 유형 기반 필터
    if (questionType) {
      query = query.eq("question_type", questionType);
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error("유사 사례 추천 실패:", error);
    return NextResponse.json({ error: "유사 사례 추천 실패" }, { status: 500 });
  }
}
