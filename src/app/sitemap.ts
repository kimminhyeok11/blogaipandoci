import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SitemapPost {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
  content: string | null;
  cover_image: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app";

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/posts/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tags/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/search/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  // 동적 게시글 (이미지 sitemap용 content, cover_image 포함)
  const supabase = getServerSupabase();
  if (!supabase) return staticPages;

  const { data } = await supabase
    .from("posts")
    .select("slug, updated_at, published_at, content, cover_image")
    .eq("published", true)
    .not("published_at", "is", null);

  const posts = (data || []) as SitemapPost[];

  const postPages: MetadataRoute.Sitemap = posts.map((post) => {
    // 본문에서 이미지 URL 추출
    const imgMatches = post.content?.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g) || [];
    const imageUrls = imgMatches.map((m) => {
      const match = m.match(/\((https?:\/\/[^)]+)\)/);
      return match?.[1];
    }).filter(Boolean) as string[];

    // cover_image가 있으면 우선 포함
    if (post.cover_image) {
      imageUrls.unshift(post.cover_image);
    }

    return {
      url: `${baseUrl}/posts/${post.slug}/`,
      lastModified: new Date(post.updated_at || post.published_at || new Date()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(imageUrls.length > 0 && { images: Array.from(new Set(imageUrls)) }),
    };
  });

  return [...staticPages, ...postPages];
}
