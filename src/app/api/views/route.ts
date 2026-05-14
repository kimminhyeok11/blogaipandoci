import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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

    const serviceSupabase = makeAdmin();

    // IP 해시 생성
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    
    // 제외 IP 체크 (환경 변수 EXCLUDED_IPS에 쉼표로 구분하여 설정)
    const excludedIps = process.env.EXCLUDED_IPS?.split(',').map(s => s.trim()) || [];
    if (excludedIps.includes(ip)) {
      // 제외 IP는 조회수 증가하지 않음
      const { data } = await serviceSupabase
        .from("posts")
        .select("view_count")
        .eq("slug", slug)
        .eq("published", true)
        .single();
      return NextResponse.json({ 
        success: true, 
        view_count: data?.view_count || 0,
        excluded: true 
      });
    }
    
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

    // view_count atomic 증가 (DB 레벨에서 race condition 방지)
    await serviceSupabase.rpc("increment_view_count", { post_slug: slug });

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
