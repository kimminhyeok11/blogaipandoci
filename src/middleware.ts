import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * IndexNow 키 파일 미들웨어
 * https://www.indexnow.org/documentation
 *
 * /<key>.txt 요청만 처리. slug redirect는 page.tsx 내부에서 처리.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // .txt로 끝나는 경로 처리 (IndexNow 키 파일) - robots.txt 제외
  if (pathname.endsWith('.txt') && pathname !== '/robots.txt') {
    const validKey = process.env.INDEXNOW_KEY;

    if (!validKey) {
      return NextResponse.next(); // env 미설정 시 정적 파일(ads.txt 등)·404로 통과
    }

    const requestedKey = pathname.slice(1, -4);

    if (requestedKey === validKey) {
      return new NextResponse(validKey, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return NextResponse.next(); // IndexNow 키 불일치 — ads.txt 등 정적 .txt 서빙으로 통과
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // IndexNow 키 파일 (.txt) — robots.txt 제외
    '/:key((?!robots$)[^/]+).txt',
  ],
};
