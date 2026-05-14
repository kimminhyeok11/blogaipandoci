import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/auth - Authorization 헤더 토큰으로 현재 사용자 정보 조회
export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error } = await anon.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const serviceSupabase = makeAdmin();
    const { data: profile } = await serviceSupabase
      .from("users")
      .select("nickname, avatar_url")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: (profile as any)?.nickname || null,
        avatar_url: (profile as any)?.avatar_url || null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
