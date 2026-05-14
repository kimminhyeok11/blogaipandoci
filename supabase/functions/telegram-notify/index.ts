import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const { record } = await req.json();

    // pending 상태인 경우만 알림
    if (record.status !== "pending") {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // 질문 유형인 경우만 알림
    if (!record.question_type) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 글 정보 조회
    const { data: post } = await supabase
      .from("posts")
      .select("title, slug")
      .eq("id", record.post_id)
      .single();

    if (!post) {
      return new Response(JSON.stringify({ error: "글을 찾을 수 없음" }), { status: 404 });
    }

    // 텔레그램 메시지 구성
    const message = `
[LAWTIPHUB 새 질문]

카테고리: ${record.question_type}

상황: ${record.topic_tags?.join(" / ") || "없음"}

질문:
${record.content}

바로가기:
https://lawtiphub.com/posts/${encodeURIComponent(post.slug)}#comments

위험도: ${record.risk_score > 50 ? "높음" : "낮음"}
`.trim();

    // 텔레그램 API 호출
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!telegramResponse.ok) {
      const error = await telegramResponse.text();
      console.error("텔레그램 알림 실패:", error);
      return new Response(JSON.stringify({ error: "텔레그램 알림 실패" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Edge Function 오류:", error);
    return new Response(JSON.stringify({ error: "서버 오류" }), { status: 500 });
  }
});
