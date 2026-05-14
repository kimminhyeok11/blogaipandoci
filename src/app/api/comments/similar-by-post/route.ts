import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/comments/similar-by-post - 글 embedding 기반 유사 질문 검색
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post_id } = body;
    const limit = Math.min(Math.max(1, parseInt(body.limit) || 5), 20);

    if (!post_id) {
      return NextResponse.json({ error: "post_id 필수" }, { status: 400 });
    }

    const admin = makeAdmin();

    const { data: comments, error } = await admin.rpc("match_comments_by_post", {
      p_post_id: post_id,
      match_count: limit,
    });

    if (error) {
      return NextResponse.json({ comments: [] });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    // post 정보 보강
    const postIds = Array.from(new Set((comments || []).map((c: any) => c.post_id as string)));
    const { data: posts } = await admin
      .from("posts")
      .select("id, title, slug")
      .in("id", postIds);

    const postMap: Record<string, { title: string; slug: string }> = {};
    (posts || []).forEach((p: any) => { postMap[p.id] = p; });

    const enriched = (comments || []).map((c: any) => ({
      ...c,
      post: postMap[c.post_id] || { title: "-", slug: "" },
    }));

    return NextResponse.json({ comments: enriched });
  } catch (error) {
    console.error("similar-by-post 검색 실패:", error);
    return NextResponse.json({ comments: [] });
  }
}
