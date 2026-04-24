import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/auth - 현재 사용자 정보
export async function GET() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    // 추가 프로필 정보 가져오기
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("users")
      .select("nickname, avatar_url")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: profile?.nickname || null,
        avatar_url: profile?.avatar_url || null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
