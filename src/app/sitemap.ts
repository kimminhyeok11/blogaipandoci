import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

interface SitemapPost {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app";

  // 정적 페이지
  const staticPages = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/posts/`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login/`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

  // 동적 게시글
  const { data } = await supabase
    .from("posts")
    .select("slug, updated_at, published_at")
    .eq("published", true)
    .neq("published_at", null);

  const posts = (data || []) as SitemapPost[];

  const postPages = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}/`,
    lastModified: new Date(post.updated_at || post.published_at || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...postPages];
}
