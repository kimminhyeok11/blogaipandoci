import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/comments/[id]/like - 좋아요 토글
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 토큰으로만 userId 결정 — body.user_id 우회 차단
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const userId = user.id;
    const admin = makeAdmin();

    // 이미 좋아요 했는지 확인
    const { data: existingLike } = await admin
      .from("comment_likes")
      .select("id")
      .eq("comment_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLike) {
      // 좋아요 취소
      await admin.from("comment_likes").delete().eq("id", existingLike.id);
    } else {
      // 좋아요 추가
      await admin.from("comment_likes").insert({ comment_id: id, user_id: userId });
    }

    // like_count 실제 count로 원자적 갱신 (supabase.raw 불신뢰 대체)
    const { count } = await admin
      .from("comment_likes")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", id);

    await admin
      .from("comments")
      .update({ like_count: count ?? 0 })
      .eq("id", id);

    return NextResponse.json({ liked: !existingLike, like_count: count ?? 0 });
  } catch (error) {
    console.error("좋아요 처리 실패:", error);
    return NextResponse.json({ error: "좋아요 처리 실패" }, { status: 500 });
  }
}
