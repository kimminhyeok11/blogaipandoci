import { supabase } from "@/lib/supabase";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app";

  // 최신 게시글 20개 가져오기
  const { data: posts } = await (supabase as any)
    .from("posts")
    .select("title, slug, excerpt, content, published_at, user:users(nickname)")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(20);

  const items = (posts || [])
    .map(
      (post: any) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/posts/${post.slug}/</link>
      <guid>${baseUrl}/posts/${post.slug}/</guid>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || post.content.slice(0, 150))}</description>
      <author>${escapeXml(post.user?.nickname || "익명")}</author>
    </item>
  `
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>法 BLOG</title>
    <link>${baseUrl}</link>
    <description>깊이 있는 분석과 인사이트</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
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
