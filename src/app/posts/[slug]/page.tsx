import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { processMarkdown } from "@/lib/markdown";
import type { Post } from "@/types";
import { PostActions } from "@/components/posts/PostActions";
import { ShareButtons } from "@/components/posts/ShareButtons";
import { RelatedPosts } from "@/components/posts/RelatedPosts";
import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/StructuredData";
import { StickyNav } from "@/components/layout/StickyNav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app";

// 동적 렌더링 - 데이터 변경 시 즉시 반영
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 서버용 Supabase 클라이언트 생성
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}


interface PostPageProps {
  params: { slug: string };
}

async function getPost(slug: string): Promise<Post | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  
  // URL 디코딩 (한글/특수문자 처리)
  const decodedSlug = decodeURIComponent(slug);
  console.log("[DEBUG] getPost - original slug:", slug);
  console.log("[DEBUG] getPost - decoded slug:", decodedSlug);
  
  const { data, error } = await supabase
    .from("posts")
    .select("*, user:users(nickname, avatar_url)")
    .eq("slug", decodedSlug)
    .eq("published", true)
    .not("published_at", "is", null)  // 메인페이지와 동일한 조건
    .single();

  if (error) {
    console.error("[DEBUG] getPost error:", error);
    return null;
  }
  
  console.log("[DEBUG] getPost - data found:", !!data);
  return data as Post;
}

// 관련 글 가져오기 (태그 기반 또는 최신글)
async function getRelatedPosts(currentPost: Post): Promise<Post[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const tagIds = currentPost.tags?.map((t) => t.id) || [];

  let relatedPosts: Post[] = [];

  // 태그가 있는 경우: 같은 태그를 가진 글 먼저 검색
  if (tagIds.length > 0) {
    const { data: taggedPosts } = await supabase
      .from("posts")
      .select("*, user:users(nickname), tags!inner(*)")
      .eq("published", true)
      .not("published_at", "is", null)
      .in("tags.id", tagIds)
      .neq("id", currentPost.id)
      .order("published_at", { ascending: false })
      .limit(6);

    if (taggedPosts) {
      relatedPosts = taggedPosts as Post[];
    }
  }

  // 태그 기반 결과가 4개 미만이면 최신글로 보충
  if (relatedPosts.length < 4) {
    const excludeIds = [currentPost.id, ...relatedPosts.map((p) => p.id)];
    const needMore = 6 - relatedPosts.length;

    const { data: recentPosts } = await supabase
      .from("posts")
      .select("*, user:users(nickname), tags(*)")
      .eq("published", true)
      .not("published_at", "is", null)
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("published_at", { ascending: false })
      .limit(needMore);

    if (recentPosts) {
      relatedPosts = [...relatedPosts, ...(recentPosts as Post[])];
    }
  }

  return relatedPosts.slice(0, 6);
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);
  const postUrl = `${SITE_URL}/posts/${params.slug}/`;

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  const description = (post.meta_description || post.excerpt || "").slice(0, 150);

  return {
    title: post.meta_title || post.title,
    description,
    keywords: post.title.split(" ").filter((w: string) => w.length > 1),
    authors: post.user?.nickname ? [{ name: post.user.nickname }] : undefined,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      locale: "ko_KR",
      url: postUrl,
      siteName: "法 BLOG",
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: post.user?.nickname ? [post.user.nickname] : undefined,
      images: post.cover_image
        ? [
            {
              url: post.cover_image,
              width: 1200,
              height: 630,
              alt: post.cover_image_alt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  // 관련 글 가져오기
  const relatedPosts = await getRelatedPosts(post);

  // 본문에서 첫 이미지 추출 (Article Schema용)
  const imgMatch = post.content?.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  const firstImage = post.cover_image || imgMatch?.[1] || undefined;
  const postUrl = `${SITE_URL}/posts/${post.slug}/`;

  return (
    <div className="min-h-screen bg-paper">
      {/* 구조화 데이터 (JSON-LD) */}
      <ArticleSchema
        title={post.title}
        description={post.excerpt || undefined}
        author={post.user?.nickname || "익명"}
        authorId={post.user_id}
        datePublished={post.published_at || post.created_at}
        dateModified={post.updated_at || undefined}
        url={postUrl}
        image={firstImage}
      />
      <BreadcrumbSchema
        items={[
          { name: "홈", url: SITE_URL },
          { name: "글 목록", url: `${SITE_URL}/posts/` },
          { name: post.title, url: postUrl },
        ]}
      />
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
        <div className="masthead-date">
          {new Date(post.published_at || post.created_at).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </header>

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/" backLabel="홈으로" />
      <div className="flex justify-end max-w-content mx-auto px-4 sm:px-6 py-2">
        <PostActions postId={post.id} slug={post.slug} authorId={post.user_id} />
      </div>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="section-label">심층 분석</div>
          <h1 className="headline">{post.title}</h1>
          {post.excerpt && <p className="subheadline">{post.excerpt}</p>}
          <div className="byline">
            <span>{post.user?.nickname || "익명"}</span>
            <span className="byline-sep">|</span>
            <span>
              {new Date(post.published_at || post.created_at).toLocaleDateString("ko-KR")}
            </span>
            <span className="byline-sep">|</span>
            <span>{post.view_count.toLocaleString()} 회 읽음</span>
          </div>
        </section>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="max-w-content mx-auto px-4 sm:px-6 mb-8 relative aspect-video max-h-[400px]">
            <Image
              src={post.cover_image}
              alt={post.cover_image_alt || post.title}
              fill
              className="object-cover rounded-sm"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
            />
          </div>
        )}

        {/* Article Content */}
        <article className="article-body">
          <div 
            className="prose-journal font-serif text-base leading-loose text-[#2a2420]"
            dangerouslySetInnerHTML={{ __html: processMarkdown(post.content) }}
          />

          <div className="ornament">— ✦ —</div>

          {/* Share */}
          <ShareButtons title={post.title} />
        </article>

        {/* Related Posts - 이어서 읽기 */}
        <RelatedPosts posts={relatedPosts} currentPostId={post.id} />
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-double border-ink text-center py-6 px-4">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
