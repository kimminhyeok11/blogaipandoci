export const dynamic = "force-dynamic";
export async function GET() {
  const baseUrl = "https://lawtiphub.com";

  const robotsTxt = `User-agent: *
Allow: /

# Next.js 정적 리소스 허용 (크롤러 렌더링에 필요)
Allow: /_next/static/
Allow: /_next/image/

# 비공개·기능 영역 차단
Disallow: /api/
Disallow: /admin/
Disallow: /write
Disallow: /login
Disallow: /profile/
Disallow: /auth/

# 검색·필터 페이지 (중복 콘텐츠 방지)
Disallow: /search

# 빌드 데이터 차단
Disallow: /build-data.json
Disallow: /posts-build-data.json

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
