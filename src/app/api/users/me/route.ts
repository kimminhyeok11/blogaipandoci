import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// DELETE /api/users/me - 회원 탈퇴
export async function DELETE(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // anon 클라이언트로 토큰 검증
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await anon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "인증 실패" }, { status: 401 });
    }

    const admin = makeAdmin();

    // public.users 삭제 (comments는 user_id ON DELETE SET NULL이면 유지)
    const { error: dbErr } = await admin.from("users").delete().eq("id", user.id);
    if (dbErr) console.warn("[탈퇴] public.users 삭제 경고:", dbErr.message);

    // auth.users 삭제 (이게 핵심 - 카카오 포함 모든 로그인 차단)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[탈퇴] auth.admin.deleteUser 실패:", deleteError);
      return NextResponse.json({ error: "계정 삭제 실패: " + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[탈퇴] 예외:", err);
    return NextResponse.json({ error: "회원 탈퇴에 실패했습니다.", detail: String(err) }, { status: 500 });
  }
}
