import { NextResponse } from "next/server";
import { notifyIndexNow } from "@/lib/indexnow";
import { createClient } from "@supabase/supabase-js";

/**
 * IndexNow 알림 API
 * POST /api/indexnow-notify
 * 
 * 글 작성/수정/삭제 시 검색엔진에 알림
 */
export async function POST(request: Request) {
  try {
    // 관리자 인증 확인
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    const { urls } = await request.json();
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 }
      );
    }

    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";
    const invalidUrls = urls.filter((u: any) => typeof u !== "string" || !u.startsWith(siteBase));
    if (invalidUrls.length > 0) {
      return NextResponse.json({ error: "허용되지 않은 URL이 포함되어 있습니다" }, { status: 400 });
    }
    
    const key = process.env.INDEXNOW_KEY;
    const host = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    if (!key) {
      return NextResponse.json(
        { error: "INDEXNOW_KEY not configured" },
        { status: 500 }
      );
    }
    
    if (!host) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL not configured" },
        { status: 500 }
      );
    }
    
    const result = await notifyIndexNow(urls, key, host);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}
