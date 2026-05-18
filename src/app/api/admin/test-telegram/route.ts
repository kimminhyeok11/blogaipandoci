import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/test-telegram
 * 테스트용 텔레그램 메시지 전송
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "메시지 내용이 필요합니다" },
        { status: 400 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // 환경 변수 체크
    if (!token) {
      console.error("[Telegram] TELEGRAM_BOT_TOKEN is not set");
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN 환경 변수가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    if (!chatId) {
      console.error("[Telegram] TELEGRAM_CHAT_ID is not set");
      return NextResponse.json(
        { error: "TELEGRAM_CHAT_ID 환경 변수가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    // 텔레그램 API 호출
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    console.log("[Telegram] Sending test message...");
    console.log("[Telegram] URL:", url.replace(token, "***"));
    console.log("[Telegram] Chat ID:", chatId);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🧪 *관리자 테스트*\n\n${message}`,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Telegram] API error:", data);
      return NextResponse.json(
        { error: `텔레그램 API 오류: ${data.description || "Unknown error"}` },
        { status: 500 }
      );
    }

    console.log("[Telegram] Message sent successfully:", data);

    return NextResponse.json({ 
      success: true, 
      message: "텔레그램 메시지가 전송되었습니다",
      telegramResponse: data 
    });

  } catch (error) {
    console.error("[Telegram] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
