import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyIndexNow } from "@/lib/indexnow";

const BATCH_SIZE = 100; // Bing Webmaster Tools 한 번에 최대 100개

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const userId = authHeader.replace("Bearer ", "");
    
    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 사용자 권한 확인
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || user?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    // 발행된 게시글 100개 조회
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("slug")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (postsError) {
      throw new Error("게시글 조회 실패: " + postsError.message);
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        { success: false, message: "제출할 게시글이 없습니다" },
        { status: 400 }
      );
    }

    // URL 목록 생성
    const baseUrl = "https://lawtiphub.com";
    const urls = posts.map((post) => `${baseUrl}/posts/${post.slug}/`);

    // 홈페이지도 포함
    urls.unshift(`${baseUrl}/`);
    urls.unshift(`${baseUrl}/posts/`);

    // IndexNow API 호출
    const indexNowKey = process.env.INDEXNOW_KEY;
    if (!indexNowKey) {
      return NextResponse.json(
        { success: false, message: "IndexNow 키가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    const result = await notifyIndexNow(urls, indexNowKey, "lawtiphub.com");

    return NextResponse.json({
      success: result.success,
      message: result.message,
      count: urls.length,
      status: result.status,
      urls: urls.slice(0, 5), // 로그용으로 5개만 반환
    });

  } catch (error) {
    console.error("IndexNow batch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "IndexNow 제출 중 오류 발생" 
      },
      { status: 500 }
    );
  }
}
