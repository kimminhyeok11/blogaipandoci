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

  if (coverImage) images.push(coverImage);

  if (content) {
    const imgMatches = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g) || [];
    for (const m of imgMatches) {
      const match = m.match(/\((https?:\/\/[^)]+)\)/);
      if (match?.[1]) images.push(match[1]);
    }

    const htmlImgMatches = content.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/g) || [];
    for (const m of htmlImgMatches) {
      const match = m.match(/src=["'](https?:\/\/[^"']+)["']/);
      if (match?.[1]) images.push(match[1]);
    }
  }

  return Array.from(new Set(images));
}

// 101~250번째 게시글 sitemap
export async function GET() {
  const baseUrl = "https://lawtiphub.com";
  const supabase = getServerSupabase();

  if (!supabase) {
    return new Response("Supabase connection failed", { status: 500 });
  }

  const { data } = await supabase
    .from("posts")
    .select("slug, title, updated_at, published_at, content, cover_image, excerpt")
    .eq("published", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .range(100, 249);

  const posts = (data || []) as SitemapPost[];

  const postXml = posts
    .map((post) => {
      const images = extractImages(post.content, post.cover_image);
      const lastmod = new Date(post.updated_at || post.published_at || new Date()).toISOString().split("T")[0];
      const imageXml = images
        .map(
          (img) => `    <image:image>
      <image:loc>${escapeXml(img)}</image:loc>
      <image:title>${escapeXml(post.title)}</image:title>
      ${post.excerpt ? `<image:caption>${escapeXml(post.excerpt)}</image:caption>` : ""}
    </image:image>`
        )
        .join("\n");

      // slug가 percent-encoded되어 있으면 디코딩 (sitemap 오류 방지)
      let sitemapSlug = post.slug;
      try {
        if (post.slug && post.slug.includes('%')) {
          sitemapSlug = decodeURIComponent(post.slug);
        }
      } catch {
        // 디코딩 실패 시 원본 유지
      }

      return `  <url>
    <loc>${escapeXml(`${baseUrl}/posts/${sitemapSlug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
${imageXml}
  </url>`;
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${postXml}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
