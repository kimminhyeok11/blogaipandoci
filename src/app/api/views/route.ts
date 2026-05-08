import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// 간단한 IP 해시 (프라이버시 보호)
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// POST /api/views - 조회수 증가 + 조회 로그 기록
export async function POST(request: Request) {
  try {
    const { slug } = await request.json();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const serviceSupabase = getServiceSupabase();

    // IP 해시 생성
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashIP(ip);

    const { data } = await serviceSupabase
      .from("posts")
      .select("id, view_count")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // view_count 증가
    await serviceSupabase
      .from("posts")
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq("slug", slug);

    // 조회 로그 기록 (post_views 테이블)
    await serviceSupabase
      .from("post_views")
      .insert({
        post_id: data.id,
        ip_hash: ipHash,
      });

    return NextResponse.json({ success: true, view_count: (data.view_count || 0) + 1 });
  } catch {
    return NextResponse.json({ error: "Failed to increment view count" }, { status: 500 });
  }
}
