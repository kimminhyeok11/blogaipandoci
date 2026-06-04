import { cache } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StickyNav } from "@/components/layout/StickyNav";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag);
  
  // ✅ DB에 존재하는 태그인지 확인 (랜덤 URL 방지)
  const tagExists = await checkTagExists(tag);
  if (!tagExists) {
    notFound(); // 존재하지 않는 태그 → 404
  }
  
  const posts = await getPostsByTag(tag);

  // 글 0개 또는 3개 미만은 thin content → noindex
  if (posts.length === 0 || posts.length < 3) {
    return {
      title: `#${tag} 관련 글 | 法 BLOG`,
      description: `${tag} 관련 글 ${posts.length}개 모음`,
      robots: { index: false, follow: true }, // noindex: thin content 방지
    };
  }

  // 조회수 최다 글 제목을 description에 포함 → 태그마다 고유 description
  const topPost = [...posts].sort((a, b) => b.view_count - a.view_count)[0];
  const description = `${tag} 관련 실제 절차·판례·법률 정보 ${posts.length}건. 「${topPost?.title.slice(0, 30) ?? tag}」 등 실무 경험 글 모음.`;

  return {
    title: `#${tag} 관련 글 | 法 BLOG`,
    description,
    alternates: {
      canonical: `${SITE_URL}/tags/${tag}`,
    },
  };
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
}

interface TagPageProps {
  params: { tag: string };
}

// 태그 존재 여부 확인 (DB에 실제로 있는 태그인지)
const checkTagExists = cache(async function checkTagExists(tagSlug: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase
      .from("tags") as any)
      .select("id")
      .eq("slug", tagSlug)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
});

const getPostsByTag = cache(async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  try {
    // 1. 태그 slug로 tag_id 찾기
    const { data: tagData, error: tagError } = await (supabase
      .from("tags") as any)
      .select("id")
      .eq("slug", tagSlug)
      .single();

    if (tagError || !tagData) {
      return [];
    }

    // 2. post_tags로 해당 태그의 게시글 ID 찾기
    const { data: postTags, error: postTagsError } = await (supabase
      .from("post_tags") as any)
      .select("post_id")
      .eq("tag_id", tagData.id);

    if (postTagsError || !postTags?.length) {
      return [];
    }

    const postIds = postTags.map((pt: any) => pt.post_id);

    // 3. posts 테이블에서 게시글 정보 가져오기
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count")
      .eq("published", true)
      .not("published_at", "is", null)
      .in("id", postIds)
      .order("published_at", { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Post[];
  } catch (error) {
    console.error("Error fetching posts by tag:", error);
    return [];
  }
});

export default async function TagPage({ params }: TagPageProps) {
  const tag = decodeURIComponent(params.tag);
  
  // ✅ DB에 존재하는 태그인지 확인 (랜덤 URL 방지)
  const tagExists = await checkTagExists(tag);
  if (!tagExists) {
    notFound(); // 존재하지 않는 태그 → 404
  }
  
  const posts = await getPostsByTag(tag);

  // ✅ 글이 없어도 404 아님 - 빈 상태 페이지 표시
  // (실제 사용된 태그지만 현재 글이 없는 경우)
  const hasPosts = posts.length > 0;

  // BreadcrumbSchema 데이터
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "태그",
        item: `${SITE_URL}/tags`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `#${tag}`,
        item: `${SITE_URL}/tags/${tag}`,
      },
    ],
  };

  // CollectionPageSchema 데이터
  const collectionData = posts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `#${tag} 관련 글 모음`,
    description: `${tag} 주제의 법률·정책·사회 분석 글 ${posts.length}개`,
    url: `${SITE_URL}/tags/${tag}`,
    isPartOf: {
      "@type": "WebSite",
      name: "法 BLOG",
      url: SITE_URL,
    },
    itemListElement: posts.map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: p.title,
      url: `${SITE_URL}/posts/${p.slug}`,
      description: p.excerpt || undefined,
      datePublished: p.published_at || undefined,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-paper">
      {/* JSON-LD 스크립트 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        suppressHydrationWarning
      />
      {collectionData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionData) }}
          suppressHydrationWarning
        />
      )}

      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/tags" backLabel="모든 태그" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">#{tag}</h1>
          </div>
          <p className="font-sans text-sm text-muted mb-4">
            {`총 ${posts.length}개의 글`}
          </p>
          <p className="font-sans text-sm text-ink leading-relaxed">
            <strong>#{tag}</strong> 관련 실제 절차 경험과 판례를 담은 글 {posts.length}건입니다.
            가장 많이 읽힌 글은 「{posts.sort((a, b) => b.view_count - a.view_count)[0]?.title.slice(0, 30)}」입니다.
          </p>
        </div>

        {/* 글 목록 또는 빈 상태 */}
        {hasPosts ? (
          <div className="grid gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="group border-b border-rule pb-6 last:border-0"
                >
                  <Link href={`/posts/${post.slug}`} className="block">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-sans text-2xs text-rust">#{tag}</span>
                      <span className="text-rule">·</span>
                      <span className="font-sans text-2xs text-muted" suppressHydrationWarning>
                        {new Date(post.published_at).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="text-rule">·</span>
                      <span className="font-sans text-2xs text-muted" suppressHydrationWarning>
                        {post.view_count.toLocaleString()}회 읽음
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-ink mb-2 group-hover:text-rust transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="font-sans text-sm text-muted leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                </article>
              ))}
            </div>
        ) : (
          /* 빈 상태 - 관련 콘텐츠 제안 */
          <div className="text-center py-16 border-2 border-dashed border-rule/50 rounded-sm">
            <Tag className="mx-auto text-muted mb-4" size={48} />
            <h3 className="text-lg font-bold text-ink mb-2">
              #{tag} 관련 글이 아직 없습니다
            </h3>
            <p className="text-muted text-sm mb-6 max-w-md mx-auto">
              이 주제에 대한 경험을 공유해 주세요. 다른 사람들에게 큰 도움이 됩니다.
            </p>
            <Link
              href="/write"
              className="inline-flex items-center px-4 py-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors font-medium"
            >
              첫 글 작성하기
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
