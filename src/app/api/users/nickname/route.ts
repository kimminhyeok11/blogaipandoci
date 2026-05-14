import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// PUT /api/users/nickname - 닉네임 변경
export async function PUT(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
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

    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (!trimmed || trimmed.length < 2) return NextResponse.json({ error: "닉네임은 2자 이상이어야 합니다." }, { status: 400 });
    if (trimmed.length > 20) return NextResponse.json({ error: "닉네임은 20자 이하여야 합니다." }, { status: 400 });
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(trimmed)) return NextResponse.json({ error: "닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다." }, { status: 400 });

    const admin = makeAdminClient();

    // 중복 확인 (본인 제외)
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("nickname", trimmed)
      .neq("id", userId)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });

    // 1) public.users 업데이트
    const { error: tableError } = await admin
      .from("users")
      .update({ nickname: trimmed })
      .eq("id", userId);
    if (tableError) throw tableError;

    // 2) auth.users metadata 동기화 (display_name, user_metadata.nickname)
    //    → CommentsSection 등에서 user.user_metadata.nickname을 참조하므로 반드시 동기화 필요
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { nickname: trimmed },
    });
    if (authError) console.error("[닉네임] auth metadata 동기화 실패 (비치명):", authError.message);

    return NextResponse.json({ success: true, nickname: trimmed });
  } catch (error) {
    console.error("닉네임 변경 실패:", error);
    return NextResponse.json({ error: "닉네임 변경에 실패했습니다." }, { status: 500 });
  }
}
