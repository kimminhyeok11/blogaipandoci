import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/supabase";
import { maskPII, calculateRiskScore } from "@/lib/pii-mask";

// GET /api/comments - 댓글 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json({ error: "post_id 필수" }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    // 댓글 목록 조회 (트리 구조)
    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        user:users(nickname, email),
        post:posts(title, slug)
      `)
      .eq("post_id", postId)
      .eq("status", "public")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 트리 구조로 변환
    const commentsMap = new Map();
    const rootComments: any[] = [];

    (comments || []).forEach((comment: any) => {
      const commentData = {
        ...comment,
        replies: [],
      };
      commentsMap.set(comment.id, commentData);

      if (comment.parent_id) {
        const parent = commentsMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentData);
        }
      } else {
        rootComments.push(commentData);
      }
    });

    return NextResponse.json({ comments: rootComments });
  } catch (error) {
    console.error("댓글 조회 실패:", error);
    return NextResponse.json({ error: "댓글 조회 실패" }, { status: 500 });
  }
}

// POST /api/comments - 댓글/질문 작성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      post_id,
      content,
      parent_id,
      user_id,
      nickname,
      is_anonymous,
      question_type,
      topic_tags,
      context_answers,
    } = body;

    if (!post_id || !content) {
      return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    // 개인정보 마스킹
    const maskedContent = maskPII(content);
    const riskScore = calculateRiskScore(content);

    // 위험도가 높으면 law_risk 상태로 설정
    const status = riskScore > 50 ? "law_risk" : "pending";

    const { data: comment, error } = await supabaseAdmin
      .from("comments")
      .insert({
        post_id,
        content: maskedContent,
        parent_id: parent_id || null,
        user_id: user_id || null,
        nickname: nickname || "익명",
        is_anonymous: is_anonymous || true,
        status,
        risk_score: riskScore,
        question_type: question_type || null,
        topic_tags: topic_tags || [],
        context_answers: context_answers || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("댓글 작성 실패:", error);
    return NextResponse.json({ error: "댓글 작성 실패" }, { status: 500 });
  }
}
