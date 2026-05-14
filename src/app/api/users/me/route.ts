import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase";

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

    const supabaseAdmin = getServiceSupabase();

    // public.users 먼저 삭제 (FK cascade 없을 경우 대비)
    await supabaseAdmin.from("users").delete().eq("id", user.id);

    // auth.users 삭제 (service_role 권한 필요)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("회원 탈퇴 실패:", error);
    return NextResponse.json({ error: "회원 탈퇴에 실패했습니다." }, { status: 500 });
  }
}
