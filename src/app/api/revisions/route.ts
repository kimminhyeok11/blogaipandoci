import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/revisions?slug=xxx - 특정 글의 히스토리 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 글 확인 및 작성자 권한 체크
    const { data: post } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("slug", slug)
      .single() as any;

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if ((post as any).user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 리비전 조회
    const { data: revisions, error } = await (supabase
      .from("post_revisions") as any)
      .select("id, title, content, excerpt, created_at, revision_number")
      .eq("post_id", (post as any).id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Revisions fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch revisions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ revisions: revisions || [] });
  } catch (error) {
    console.error("Revisions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revisions" },
      { status: 500 }
    );
  }
}

// POST /api/revisions - 리비전 저장
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post_id, title, content, excerpt, revision_number } = body;

    if (!post_id || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 작성자 확인
    const { data: post } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", post_id)
      .single() as any;

    if (!post || (post as any).user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 리비전 저장 (최신 10개만 유지)
    const { data: revision, error } = await (supabase
      .from("post_revisions") as any)
      .insert({
        post_id,
        title,
        content,
        excerpt: excerpt || "",
        revision_number: revision_number || 1,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Revision save error:", error);
      return NextResponse.json(
        { error: "Failed to save revision" },
        { status: 500 }
      );
    }

    // 오래된 리비전 정리 (최신 10개만 유지)
    const { data: oldRevisions } = await (supabase
      .from("post_revisions") as any)
      .select("id")
      .eq("post_id", post_id)
      .order("created_at", { ascending: false })
      .gt("id", 10);

    if (oldRevisions && oldRevisions.length > 0) {
      const idsToDelete = (oldRevisions as any[]).slice(10).map((r) => r.id);
      if (idsToDelete.length > 0) {
        await (supabase.from("post_revisions") as any).delete().in("id", idsToDelete);
      }
    }

    return NextResponse.json({ revision });
  } catch (error) {
    console.error("Revision save API error:", error);
    return NextResponse.json(
      { error: "Failed to save revision" },
      { status: 500 }
    );
  }
}

// DELETE /api/revisions?id=xxx - 특정 리비전 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const revisionId = searchParams.get("id");

    if (!revisionId) {
      return NextResponse.json(
        { error: "Revision ID is required" },
        { status: 400 }
      );
    }

    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await (supabase
      .from("post_revisions") as any)
      .delete()
      .eq("id", revisionId)
      .eq("created_by", user.id);

    if (error) {
      console.error("Revision delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete revision" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revision delete API error:", error);
    return NextResponse.json(
      { error: "Failed to delete revision" },
      { status: 500 }
    );
  }
}
