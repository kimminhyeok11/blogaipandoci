import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const content = `# Lawtiphub

> 한국 법률 정보 플랫폼. 실제 절차 경험 기반의 법률·정책·사회 이슈 심층 분석.

## 사이트 정보
- 이름: 法 BLOG (Lawtiphub)
- 언어: 한국어
- 도메인: https://lawtiphub.com

## 주요 URL
- https://lawtiphub.com/sitemap.xml
- https://lawtiphub.com/robots.txt
- https://lawtiphub.com/posts
- https://lawtiphub.com/rss.xml

## 콘텐츠 분야
- 형사·고소 절차
- 채무·금전 문제
- 전세·임대차 분쟁
- 상속·유언
- 이혼·가족법
- 계약·거래 분쟁
- 행정·기타 법률 문제
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
