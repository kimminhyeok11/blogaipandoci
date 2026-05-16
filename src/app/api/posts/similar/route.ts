import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/posts/similar - 현재 글의 embedding 기반 유사 글 검색
export async function POST(request: Request) {
  try {
    const { post_id, limit = 5 } = await request.json();
    if (!post_id) return NextResponse.json({ posts: [] });

    const admin = makeAdmin();

    // 현재 글의 embedding 조회
    const { data: post, error: postErr } = await admin
      .from("posts")
      .select("embedding")
      .eq("id", post_id)
      .single();

    if (postErr || !post?.embedding) {
      return NextResponse.json({ posts: [] });
    }

    // match_similar_posts RPC 호출
    const { data: similar, error: rpcErr } = await admin.rpc("match_similar_posts", {
      query_embedding: post.embedding,
      exclude_post_id: post_id,
      match_count: Math.min(Math.max(1, parseInt(limit)), 10),
    });

    if (rpcErr) {
      console.error("[similar-posts] RPC 오류:", rpcErr.message);
      return NextResponse.json({ posts: [] });
    }

    return NextResponse.json({ posts: similar || [] });
  } catch (err) {
    console.error("[similar-posts] 오류:", err);
    return NextResponse.json({ posts: [] });
  }
}
