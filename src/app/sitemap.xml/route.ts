import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SitemapPost {
  slug: string;
  title: string;
  updated_at: string | null;
  published_at: string | null;
  content: string | null;
  cover_image: string | null;
  excerpt: string | null;
}

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractImages(content: string | null, coverImage: string | null): string[] {
  const images: string[] = [];

  // cover_image 우선
  if (coverImage) images.push(coverImage);

  // 마크다운 본문에서 이미지 추출
  if (content) {
    const imgMatches = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g) || [];
    for (const m of imgMatches) {
      const match = m.match(/\((https?:\/\/[^)]+)\)/);
      if (match?.[1]) images.push(match[1]);
    }

    // HTML img 태그에서도 추출
    const htmlImgMatches = content.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/g) || [];
    for (const m of htmlImgMatches) {
      const match = m.match(/src=["'](https?:\/\/[^"']+)["']/);
      if (match?.[1]) images.push(match[1]);
    }
  }

  // 중복 제거
  return Array.from(new Set(images));
}

export async function GET() {
  // 환경변수 무시하고 신규 도메인 강제 사용 (전환 기간 동안)
  const baseUrl = "https://lawtiphub.com";

  // 정적 페이지
  const staticPages = [
    { url: `${baseUrl}`, changefreq: "daily", priority: "1.0", lastmod: new Date().toISOString().split("T")[0] },
    { url: `${baseUrl}/posts`, changefreq: "daily", priority: "0.9", lastmod: new Date().toISOString().split("T")[0] },
    { url: `${baseUrl}/about`, changefreq: "monthly", priority: "0.7", lastmod: "2025-10-01" },
    { url: `${baseUrl}/contact`, changefreq: "yearly", priority: "0.5", lastmod: "2025-10-01" },
    { url: `${baseUrl}/tags`, changefreq: "weekly", priority: "0.7", lastmod: new Date().toISOString().split("T")[0] },
    { url: `${baseUrl}/cases`, changefreq: "weekly", priority: "0.8", lastmod: new Date().toISOString().split("T")[0] },
    { url: `${baseUrl}/privacy`, changefreq: "yearly", priority: "0.3", lastmod: "2025-10-01" },
    { url: `${baseUrl}/terms`, changefreq: "yearly", priority: "0.3", lastmod: "2025-10-01" },
  ];

  const staticXml = staticPages
    .map(
      (p) => `  <url>
    <loc>${escapeXml(p.url)}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");

  // 동적 게시글 + 사건 유형 페이지
  let postXml = "";
  let caseTypeXml = "";
  const supabase = getServerSupabase();

  if (supabase) {
    // 사건 유형별 페이지 (case_type 있는 것만)
    const { data: caseData } = await supabase
      .from("posts")
      .select("case_type, updated_at")
      .eq("published", true)
      .not("published_at", "is", null)
      .not("case_type", "is", null);

    const caseTypes = Array.from(new Set((caseData || []).map((r: any) => r.case_type).filter(Boolean)));
    caseTypeXml = caseTypes.map((ct: string) => `  <url>
    <loc>${escapeXml(`${baseUrl}/cases/${encodeURIComponent(ct)}`)}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n");

    const { data } = await supabase
      .from("posts")
      .select("slug, title, updated_at, published_at, content, cover_image, excerpt")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

    const posts = (data || []) as SitemapPost[];

    postXml = posts
      .map((post) => {
        const images = extractImages(post.content, post.cover_image);
        const lastmod = new Date(post.updated_at || post.published_at || new Date()).toISOString();
        const imageXml = images
          .map(
            (img) => `    <image:image>
      <image:loc>${escapeXml(img)}</image:loc>
      <image:title>${escapeXml(post.title)}</image:title>
      ${post.excerpt ? `<image:caption>${escapeXml(post.excerpt)}</image:caption>` : ""}
    </image:image>`
          )
          .join("\n");

        return `  <url>
    <loc>${escapeXml(`${baseUrl}/posts/${encodeURIComponent(post.slug)}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${imageXml}
  </url>`;
      })
      .join("\n");
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticXml}
${caseTypeXml}
${postXml}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60", // 도메인 전환 기간 동안 짧게 캐시
    },
  });
}
