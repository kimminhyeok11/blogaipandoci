import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
  }).catch(() => {});
}

// POST /api/comments/[id]/report - 신고
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { reason } = await request.json();

    if (!reason) {
      return NextResponse.json({ error: "신고 사유 필수" }, { status: 400 });
    }

    // 토큰으로만 reporter_id 결정 — body.reporter_id 우회 차단
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const reporterId = user.id;
    const supabaseAdmin = makeAdmin();

    // 중복 신고 확인
    const { data: existingReport } = await supabaseAdmin
      .from("comment_reports")
      .select("id")
      .eq("comment_id", id)
      .eq("reporter_id", reporterId)
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json({ error: "이미 신고했습니다" }, { status: 400 });
    }

    // 신고 등록
    const { error: insertError } = await supabaseAdmin
      .from("comment_reports")
      .insert({ comment_id: id, reporter_id: reporterId, reason });

    if (insertError) throw insertError;

    // 신고 누적 수 확인
    const { count } = await supabaseAdmin
      .from("comment_reports")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", id);

    const reportCount = count || 0;

    // 3회 이상 신고 시 자동 숨김
    if (reportCount >= 3) {
      await supabaseAdmin
        .from("comments")
        .update({ status: "hidden" })
        .eq("id", id);
    }

    // 댓글 정보 조회
    const { data: comment } = await supabaseAdmin
      .from("comments")
      .select("content, nickname, post:posts(title, slug)")
      .eq("id", id)
      .single() as any;

    // 텔레그램 알림
    const autoHiddenMsg = reportCount >= 3 ? "\n⚠️ 3회 신고 초과 → 자동 숨김 처리됨" : "";
    await sendTelegramAlert(
`[LAWTIPHUB 댓글 신고]

신고 사유: ${reason}
누적 신고: ${reportCount}회
작성자: ${comment?.nickname || "알 수 없음"}
내용: ${(comment?.content || "").slice(0, 100)}
글: ${comment?.post?.title || ""}${autoHiddenMsg}

관리자 확인: https://lawtiphub.com/admin/comments`
    );

    return NextResponse.json({ success: true, reportCount });
  } catch (error) {
    console.error("신고 실패:", error);
    return NextResponse.json({ error: "신고 실패" }, { status: 500 });
  }
}
