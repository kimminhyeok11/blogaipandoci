import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/notify-signup
 * 새 회원가입 시 텔레그램 알림
 */
export async function POST(request: NextRequest) {
  try {
    const { email, nickname, userId } = await request.json();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("[Telegram Signup] Missing environment variables");
      return NextResponse.json(
        { error: "텔레그램 설정 없음" },
        { status: 500 }
      );
    }

    const message = `🎉 *새 회원 가입*

📧 이메일: ${email || "미제공"}
👤 닉네임: ${nickname || "미설정"}
🆔 ID: ${userId?.slice(0, 8)}...
🕐 시간: ${new Date().toLocaleString("ko-KR")}

[프로필 보기] https://lawtiphub.com/profile`;

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Telegram Signup] API error:", errorData);
      return NextResponse.json(
        { error: "텔레그램 전송 실패" },
        { status: 500 }
      );
    }

    console.log("[Telegram Signup] Notification sent for:", email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Telegram Signup] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}
