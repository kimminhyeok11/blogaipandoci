import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/revisions?slug=xxx - 특정 글의 히스토리 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = makeAdmin();
    
    const { data: post, error: postError } = await serviceSupabase
      .from("posts")
      .select("id, user_id")
      .eq("slug", slug)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: revisions, error } = await serviceSupabase
      .from("post_revisions")
      .select("id, title, content, excerpt, created_at, revision_number")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 });
    }

    return NextResponse.json({ revisions: revisions || [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 });
  }
}

// POST /api/revisions - 리비전 저장
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post_id, title, content, excerpt, revision_number } = body;

    if (!post_id || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = makeAdmin();
    
    const { data: post, error: postError } = await serviceSupabase
      .from("posts")
      .select("user_id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: revision, error: insertError } = await serviceSupabase
      .from("post_revisions")
      .insert({
        post_id,
        title,
        content,
        excerpt: excerpt || null,
        revision_number: revision_number || 1,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to save revision" }, { status: 500 });
    }

    return NextResponse.json({ success: true, revision });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save revision" }, { status: 500 });
  }
}
