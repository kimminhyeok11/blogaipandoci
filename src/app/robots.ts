import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

  return {
    rules: [
      {
        // Googlebot 전용 규칙 - 콘텐츠 페이지 명시적 허용
        userAgent: "Googlebot",
        allow: ["/", "/posts/", "/tags/", "/about", "/author", "/contact", "/privacy", "/terms"],
        disallow: ["/login", "/write", "/api/", "/admin/", "/profile/", "/search", "/categories", "/auth/"],
      },
      {
        // 일반 봇 규칙
        userAgent: "*",
        allow: ["/", "/posts/", "/tags/"],
        disallow: ["/login", "/write", "/api/", "/admin/", "/profile/", "/search", "/categories", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
