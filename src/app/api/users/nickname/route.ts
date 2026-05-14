import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase";

// PUT /api/users/nickname - 닉네임 변경
export async function PUT(request: Request) {
  try {
    // Authorization 헤더 토큰으로 신원 검증
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    // 하위 호환: 토큰 없으면 body의 userId 사용 (auth/callback 에서 직접 호출)
    const body = await request.json();
    const { nickname } = body;

    let userId: string | null = body.userId || null;

    if (token) {
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user }, error } = await anon.auth.getUser(token);
      if (error || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });
      userId = user.id;
    }
    const trimmed = nickname?.trim();

    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!trimmed || trimmed.length < 2) {
      return NextResponse.json({ error: "닉네임은 2자 이상이어야 합니다." }, { status: 400 });
    }
    if (trimmed.length > 20) {
      return NextResponse.json({ error: "닉네임은 20자 이하여야 합니다." }, { status: 400 });
    }
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: "닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다." }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }

    // 중복 확인 (본인 제외)
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("nickname", trimmed)
      .neq("id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ nickname: trimmed })
      .eq("id", userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, nickname: trimmed });
  } catch (error) {
    console.error("닉네임 변경 실패:", error);
    return NextResponse.json({ error: "닉네임 변경에 실패했습니다." }, { status: 500 });
  }
}
