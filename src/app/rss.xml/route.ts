import { getServiceSupabase, supabase as anonSupabase } from "@/lib/supabase";

interface RssPost {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  published_at: string;
  user: { nickname: string | null } | null;
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

  const supabase = (() => { try { return getServiceSupabase(); } catch { return anonSupabase; } })();
  
  // 최신 게시글 20개 가져오기 (user 조인 제거)
  const { data: postsData } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, content, published_at, user_id")
    .eq("published", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(20);

  const postsRaw = (postsData || []) as Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    published_at: string;
    user_id: string;
  }>;

  // user_id 목록 수집
  const uniqueUserIds = new Set<string>();
  postsRaw.forEach((p) => { if (p.user_id) uniqueUserIds.add(p.user_id); });
  const userIds = Array.from(uniqueUserIds);
  
  // users 별도 조회
  const usersMap: Record<string, { nickname: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, nickname")
      .in("id", userIds);
    
    users?.forEach((u: any) => {
      usersMap[u.id] = { nickname: u.nickname };
    });
  }

  // user 매핑
  const posts: RssPost[] = postsRaw.map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    published_at: post.published_at,
    user: usersMap[post.user_id] || null,
  }));

  const items = posts
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/posts/${encodeURIComponent(post.slug)}</link>
      <guid>${baseUrl}/posts/${encodeURIComponent(post.slug)}</guid>
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
