import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { notifyIndexNow } from "@/lib/indexnow";

const BATCH_SIZE = 100; // Bing Webmaster Tools 한 번에 최대 100개

// 관리자 권한 확인 헬퍼
async function verifyAdmin(request: NextRequest) {
  const serviceSupabase = getServiceSupabase();
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const userId = authHeader?.replace('Bearer ', '');
  
  if (!userId) return { error: "인증이 필요합니다", status: 401, serviceSupabase };

  const { data: userData, error: roleError } = await serviceSupabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single() as { data: { role: string } | null; error: Error | null };

  if (roleError || userData?.role !== 'admin') {
    return { error: "관리자 권한이 필요합니다", status: 403, serviceSupabase };
  }

  return { error: null, status: 200, serviceSupabase };
}

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const auth = await verifyAdmin(request);
    if (auth.error) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }
    const supabase = auth.serviceSupabase;

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
    const urls = posts.map((post: { slug: string }) => `${baseUrl}/posts/${post.slug}/`);

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
