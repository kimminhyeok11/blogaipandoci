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

// 사건 유형별 페이지 sitemap
export async function GET() {
  try {
    const baseUrl = "https://lawtiphub.com";
    const supabase = getServerSupabase();

    if (!supabase) {
      console.error("[Sitemap/Cases] Supabase connection failed");
      return new Response("Supabase connection failed", { status: 500 });
    }

    // categories 테이블 기준으로 sitemap 생성 (활성 카테고리만)
    const { data: categories, error } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true)
      .gt("post_count", 0);

    if (error) {
      console.error("[Sitemap/Cases] DB error:", error);
      throw error;
    }

    // invalid category skip (null/undefined slug 제거)
    const caseTypes = (categories || [])
      .map((c: any) => c.slug)
      .filter((slug: string | null | undefined) => typeof slug === 'string' && slug.length > 0);

    if (caseTypes.length === 0) {
      console.warn("[Sitemap/Cases] No active categories found");
    }

  const caseXml = caseTypes.map((ct: string) => `  <url>
    <loc>${escapeXml(`${baseUrl}/cases/${encodeURIComponent(ct)}`)}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${caseXml}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[Sitemap/Cases] Unexpected error:", err);
    // sitemap 500은 SEO에 치명적이므로 빈 sitemap 반환 (graceful degradation)
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
