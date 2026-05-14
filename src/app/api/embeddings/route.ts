import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// POST /api/embeddings - 댓글 embedding 생성 및 저장 (관리자 전용)
export async function POST(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const admin = makeAdmin();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    const body = await request.json();
    const { comment_id, text } = body;

    if (!comment_id || !text) {
      return NextResponse.json({ error: "comment_id와 text 필수" }, { status: 400 });
    }

    const embedding = await createEmbedding(text);

    const { error } = await admin
      .from("comments")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", comment_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Embedding 생성 실패:", error);
    return NextResponse.json({ error: "Embedding 생성 실패" }, { status: 500 });
  }
}

// POST /api/embeddings/search - 유사 사례 semantic 검색 (공개)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { text, post_id, limit = 5 } = body;

    if (!text || !post_id) {
      return NextResponse.json({ error: "text와 post_id 필수" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ comments: [] });
    }

    const embedding = await createEmbedding(text);
    const admin = makeAdmin();

    const { data: comments, error } = await admin.rpc("match_similar_comments", {
      query_embedding: embedding,
      exclude_post_id: post_id,
      match_count: limit,
    });

    if (error) throw error;

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
    console.error("Semantic 검색 실패:", error);
    return NextResponse.json({ comments: [] });
  }
}
