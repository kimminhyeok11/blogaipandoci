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

    const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const serviceSupabase = makeAdmin();
    
    const { data: post, error: postError } = await serviceSupabase
      .from("posts")
      .select("id, user_id")
      .eq("slug", slug)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { data: callerProfile } = await serviceSupabase
      .from("users").select("role").eq("id", userId).single();
    const isAdmin = callerProfile?.role === "admin";

    if (post.user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: revisions, error } = await serviceSupabase
      .from("post_revisions")
      .select("id, title, content, excerpt, meta_title, meta_description, cover_image, cover_image_alt, slug, created_at, revision_number")
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
    const { post_id, title, content, excerpt, meta_title, meta_description, cover_image, cover_image_alt, slug } = body;

    if (!post_id || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

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

    // 현재 최대 revision_number 조회 → 자동 증가
    const { data: latestRevision } = await serviceSupabase
      .from("post_revisions")
      .select("revision_number")
      .eq("post_id", post_id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextRevisionNumber = (latestRevision?.revision_number ?? 0) + 1;

    const { data: revision, error: insertError } = await serviceSupabase
      .from("post_revisions")
      .insert({
        post_id,
        title,
        content,
        excerpt: excerpt || null,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
        cover_image: cover_image || null,
        cover_image_alt: cover_image_alt || null,
        slug: slug || null,
        revision_number: nextRevisionNumber,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[revisions] insert 실패:", JSON.stringify(insertError), "payload:", { post_id, title: title?.slice(0, 30), excerpt: excerpt?.slice(0, 30) });
      return NextResponse.json({ error: "Failed to save revision", detail: insertError.message }, { status: 500 });
    }

    // 최대 10개 유지 — 초과분(오래된 것) 자동 삭제
    const MAX_REVISIONS = 10;
    const { data: allRevisions } = await serviceSupabase
      .from("post_revisions")
      .select("id")
      .eq("post_id", post_id)
      .order("revision_number", { ascending: false });

    if (allRevisions && allRevisions.length > MAX_REVISIONS) {
      const toDelete = allRevisions.slice(MAX_REVISIONS).map((r: any) => r.id);
      await serviceSupabase
        .from("post_revisions")
        .delete()
        .in("id", toDelete);
    }

    return NextResponse.json({ success: true, revision });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save revision" }, { status: 500 });
  }
}
