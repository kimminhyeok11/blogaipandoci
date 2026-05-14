import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { maskPII, calculateRiskScore } from "@/lib/pii-mask";

async function sendTelegramAlert(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  }).catch(() => {});
}

function makeAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing: " + (!url ? "URL" : "SERVICE_ROLE_KEY"));
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function makeAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env missing: " + (!url ? "URL" : "ANON_KEY"));
  return createClient(url, key);
}

// 요청자 세션에서 user_id와 role 추출
async function getRequester(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return { userId: null, role: null };

    const { data: { user }, error } = await makeAnonClient().auth.getUser(token);
    if (error || !user) return { userId: null, role: null };

    const { data: profile } = await makeAdminClient()
      .from("users").select("role").eq("id", user.id).single();

    return { userId: user.id, role: profile?.role ?? "user" };
  } catch {
    return { userId: null, role: null };
  }
}

function maskComment(comment: any, requesterId: string | null, requesterRole: string | null) {
  // 비밀 질문이 아니면 그대로 반환
  if (!comment.is_secret) return comment;

  const isOwner = requesterId && comment.user_id === requesterId;
  const isAdmin = requesterRole === "admin";

  // 작성자 본인 또는 관리자면 원본 반환
  if (isOwner || isAdmin) return comment;

  // 그 외에는 내용 마스킹
  return {
    ...comment,
    content: "🔒 비밀 질문입니다.",
    context_answers: null,
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

    const admin = makeAdminClient();

    // 요청자 신원 확인
    const { userId: requesterId, role: requesterRole } = await getRequester(request);

    // 댓글 목록 조회 - 본인 + 관리자만 전체 조회, 그 외는 빈 배열
    if (!requesterId) {
      return NextResponse.json({ comments: [] });
    }

    let query = admin
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

    // 관리자가 아니면: 본인이 쓴 댓글 + 본인 댓글에 달린 답글 모두 조회
    if (requesterRole !== "admin") {
      // 본인 루트 댓글 ID 먼저 조회
      const { data: myRoots } = await admin
        .from("comments")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", requesterId)
        .is("parent_id", null);

      const myRootIds = (myRoots ?? []).map((r: any) => r.id);

      // 본인이 쓴 댓글 OR 본인 루트댓글의 답글
      if (myRootIds.length > 0) {
        query = query.or(`user_id.eq.${requesterId},parent_id.in.(${myRootIds.join(",")})`);
      } else {
        query = query.eq("user_id", requesterId);
      }
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    // 1-pass: Map 등록 + 마스킹
    const map = new Map<string, any>();
    (comments ?? []).forEach((c: any) => {
      map.set(c.id, { ...maskComment(c, requesterId, requesterRole), replies: [] });
    });

    // 2-pass: 트리 조립 (정렬 순서 무관)
    const roots: any[] = [];
    map.forEach((c) => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id).replies.push(c);
      } else {
        roots.push(c);
      }
    });

    // 루트: 최신순 / 답글: 오래된순
    roots.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    roots.forEach((c) => c.replies.sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at)));

    return NextResponse.json({ comments: roots });
  } catch (err) {
    console.error("[GET /api/comments] 오류:", err);
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: "댓글 조회 실패", detail: msg }, { status: 500 });
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

    const admin = makeAdminClient();

    const maskedContent = maskPII(content);
    const riskScore = calculateRiskScore(content);
    const status = riskScore > 50 ? "law_risk" : "pending";

    const { data: comment, error } = await admin
      .from("comments")
      .insert({
        post_id,
        content: maskedContent,
        parent_id: parent_id || null,
        user_id: user_id || null,
        nickname: nickname || "익명",
        is_anonymous: is_anonymous ?? true,
        status,
        risk_score: riskScore,
        question_type: question_type || null,
        topic_tags: topic_tags || [],
        context_answers: context_answers || {},
      })
      .select()
      .single();

    if (error) throw error;

    // embedding 생성 (비동기, 실패해도 응답에 영향 없음)
    if (process.env.OPENAI_API_KEY && comment?.id) {
      const embeddingText = [question_type, ...(topic_tags || []), maskedContent].filter(Boolean).join(" ");
      fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: embeddingText.slice(0, 8000) }),
      }).then(r => r.json()).then(embRes => {
        const vec = embRes?.data?.[0]?.embedding;
        if (vec) {
          admin.from("comments").update({ embedding: JSON.stringify(vec) }).eq("id", comment.id).then(() => {});
        }
      }).catch(() => {});
    }

    // 텔레그램 알림 (비동기, 실패해도 응답에 영향 없음)
    admin.from("posts").select("title, slug").eq("id", post_id).single().then(({ data: post }) => {
      const postTitle = post?.title || "-";
      const postUrl = post?.slug ? `https://lawtiphub.com/posts/${post.slug}` : "-";
      sendTelegramAlert(
`[LAWTIPHUB 새 질문]

닉네임: ${nickname || "익명"}
내용: ${maskedContent.slice(0, 200)}${maskedContent.length > 200 ? "..." : ""}
유형: ${question_type || "-"}
태그: ${(topic_tags || []).join(", ") || "-"}
글: ${postTitle}
링크: ${postUrl}`
      );
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/comments] 오류:", err);
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: "댓글 작성 실패", detail: msg }, { status: 500 });
  }
}
