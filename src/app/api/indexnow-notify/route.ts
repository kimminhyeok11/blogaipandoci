import { NextResponse } from "next/server";
import { notifyIndexNow } from "@/lib/indexnow";

/**
 * IndexNow 알림 API
 * POST /api/indexnow-notify
 * 
 * 글 작성/수정/삭제 시 검색엔진에 알림
 */
export async function POST(request: Request) {
  try {
    const { urls } = await request.json();
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 }
      );
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
