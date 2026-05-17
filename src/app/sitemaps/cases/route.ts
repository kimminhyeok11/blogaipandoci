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
  const baseUrl = "https://lawtiphub.com";
  const supabase = getServerSupabase();

  if (!supabase) {
    return new Response("Supabase connection failed", { status: 500 });
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("case_type, updated_at")
    .eq("published", true)
    .not("published_at", "is", null)
    .not("case_type", "is", null);

  const caseTypes = Array.from(new Set((posts || []).map((r: any) => r.case_type).filter(Boolean)));

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
}
