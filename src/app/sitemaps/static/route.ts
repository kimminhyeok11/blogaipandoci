// 정적 페이지 sitemap
export async function GET() {
  const baseUrl = "https://lawtiphub.com";
  const today = new Date().toISOString().split("T")[0];

  const staticPages = [
    { url: `${baseUrl}`, changefreq: "daily", priority: "1.0", lastmod: today },
    { url: `${baseUrl}/posts`, changefreq: "daily", priority: "0.9", lastmod: today },
    { url: `${baseUrl}/about`, changefreq: "monthly", priority: "0.7", lastmod: "2025-10-01" },
    { url: `${baseUrl}/contact`, changefreq: "yearly", priority: "0.5", lastmod: "2025-10-01" },
    { url: `${baseUrl}/tags`, changefreq: "weekly", priority: "0.7", lastmod: today },
    { url: `${baseUrl}/cases`, changefreq: "weekly", priority: "0.8", lastmod: today },
    { url: `${baseUrl}/situations`, changefreq: "weekly", priority: "0.8", lastmod: today },
    { url: `${baseUrl}/privacy`, changefreq: "yearly", priority: "0.3", lastmod: "2025-10-01" },
    { url: `${baseUrl}/terms`, changefreq: "yearly", priority: "0.3", lastmod: "2025-10-01" },
    { url: `${baseUrl}/author`, changefreq: "monthly", priority: "0.6", lastmod: today },
  ];

  const staticXml = staticPages
    .map(
      (p) => `  <url>
    <loc>${p.url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
