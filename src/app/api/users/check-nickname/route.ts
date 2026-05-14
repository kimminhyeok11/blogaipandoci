import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/users/check-nickname?nickname=xxx - 닉네임 중복 확인
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get("nickname")?.trim();

  if (!nickname || nickname.length < 2) {
    return NextResponse.json({ available: false, message: "닉네임은 2자 이상이어야 합니다." });
  }
  if (nickname.length > 20) {
    return NextResponse.json({ available: false, message: "닉네임은 20자 이하여야 합니다." });
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return NextResponse.json({ available: false, message: "닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다." });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  return NextResponse.json({
    available: !data,
    message: data ? "이미 사용 중인 닉네임입니다." : "사용 가능한 닉네임입니다.",
  });
}
