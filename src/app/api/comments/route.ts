import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase";
import { maskPII, calculateRiskScore } from "@/lib/pii-mask";

// 요청자 세션에서 user_id와 role 추출
async function getRequester(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return { userId: null, role: null };

    const supabaseAdmin = getServiceSupabase();
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return { userId: null, role: null };

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    return { userId: user.id, role: profile?.role || "user" };
  } catch {
    return { userId: null, role: null };
  }
}

function maskComment(comment: any, requesterId: string | null, requesterRole: string | null) {
  const isOwner = requesterId && comment.user_id === requesterId;
  const isAdmin = requesterRole === "admin";

  if (isOwner || isAdmin) {
    return { ...comment, is_secret: false };
  }

  // 타인에게는 내용 숨김
  return {
    ...comment,
    content: "🔒 비밀 질문입니다.",
    context_answers: null,
    is_secret: true,
  };
}

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

    // 요청자 신원 확인
    const { userId: requesterId, role: requesterRole } = await getRequester(request);

    // 댓글 목록 조회 (트리 구조)
    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        user:users(nickname, email),
        post:posts(title, slug)
      `)
      .eq("post_id", postId)
      .in("status", ["public", "pending"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 트리 구조로 변환 + 비밀글 마스킹
    const commentsMap = new Map();
    const rootComments: any[] = [];

    (comments || []).forEach((comment: any) => {
      const masked = maskComment(comment, requesterId, requesterRole);
      const commentData = { ...masked, replies: [] };
      commentsMap.set(comment.id, commentData);

      if (comment.parent_id) {
        const parent = commentsMap.get(comment.parent_id);
        if (parent) parent.replies.push(commentData);
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
