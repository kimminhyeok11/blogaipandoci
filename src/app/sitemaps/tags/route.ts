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

  // 1. 태그 목록 조회
  const { data: tags } = await supabase
    .from("tags")
    .select("id, slug, updated_at")
    .order("name", { ascending: true });

  // 2. 각 태그별 글 개수 조회 후 필터링 (PostgREST relation 대신 안전한 방식)
  const tagsWithCount = await Promise.all(
    (tags || []).map(async (tag) => {
      const { count, error: countError } = await supabase
        .from("post_tags")
        .select("*", { count: "exact", head: true })
        .eq("tag_id", tag.id);
      
      if (countError) {
        console.error(`[sitemap:tags] Count error for tag ${tag.slug}:`, countError);
      }
      
      return {
        ...tag,
        postCount: count || 0,
      };
    })
  );

  // 글 2개 이상인 태그만 sitemap에 포함
  const tagXml = tagsWithCount
    .filter((tag) => tag.postCount >= 2)
    .map((tag) => `  <url>
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
