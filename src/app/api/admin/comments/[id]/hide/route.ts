import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PUT /api/admin/comments/[id]/hide - 댓글 숨김
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const admin = makeAdmin();
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    const { error } = await admin
      .from("comments")
      .update({ status: "hidden" })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("숨김 실패:", error);
    return NextResponse.json({ error: "숨김 실패" }, { status: 500 });
  }
}
