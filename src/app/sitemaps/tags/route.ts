import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

// 태그 페이지 sitemap (글 2개 이상인 태그만)
export async function GET() {
  const baseUrl = "https://lawtiphub.com";
  const supabase = getServerSupabase();

  if (!supabase) {
    return new Response("Supabase connection failed", { status: 500 });
  }

  const { data: tags } = await supabase
    .from("tags")
    .select("slug, updated_at, post_tags(count)")
    .order("name", { ascending: true });

  const tagXml = (tags || [])
    .filter((tag: any) => (tag.post_tags?.[0]?.count ?? 0) >= 2)
    .map((tag: any) => `  <url>
    <loc>${escapeXml(`${baseUrl}/tags/${encodeURIComponent(tag.slug)}`)}</loc>
    <lastmod>${new Date(tag.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tagXml}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
