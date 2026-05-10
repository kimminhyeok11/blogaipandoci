import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * IndexNow 키 파일 미들웨어
 * https://www.indexnow.org/documentation
 * 
 * /<key>.txt 요청을 처리하여 IndexNow 키 파일 제공
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // .txt로 끝나는 경로 처리 (IndexNow 키 파일)
  if (pathname.endsWith('.txt')) {
    const validKey = process.env.INDEXNOW_KEY;
    
    if (!validKey) {
      return new NextResponse("IndexNow key not configured", { status: 404 });
    }
    
    // 경로에서 키 추출 (앞의 슬래시와 뒤의 .txt 제거)
    const requestedKey = pathname.slice(1, -4); // "/<key>.txt" -> "<key>"
    
    // 요청된 키가 유효한 키와 일치하는지 확인
    if (requestedKey === validKey) {
      // 키 파일 내용 반환 (키 값 그대로)
      return new NextResponse(validKey, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600", // 1시간 캐시
        },
      });
    }
    
    // 키가 일치하지 않으면 404
    return new NextResponse("Invalid key", { status: 404 });
  }
  
  // 다른 요청은 정상적으로 처리 계속
  return NextResponse.next();
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: [
    // .txt 파일 (IndexNow 키 파일) - robots.txt는 제외
    '/:key((?!robots$)[^/]+).txt',
    // API routes 제외
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
