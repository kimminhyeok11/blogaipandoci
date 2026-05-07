import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// POST /api/views - 조회수 증가 (중복 방지는 클라이언트 쿠키로 처리)
export async function POST(request: Request) {
  try {
    const { slug } = await request.json();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();

    const { data } = await serviceSupabase
      .from("posts")
      .select("view_count")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await serviceSupabase
      .from("posts")
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq("slug", slug);

    return NextResponse.json({ success: true, view_count: (data.view_count || 0) + 1 });
  } catch {
    return NextResponse.json({ error: "Failed to increment view count" }, { status: 500 });
  }
}
