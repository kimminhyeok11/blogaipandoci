import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import dynamicImport from "next/dynamic";
import { notFound, permanentRedirect } from "next/navigation";
import { ViewCounter } from "@/components/posts/ViewCounter";
import { getServiceSupabase, supabase as anonSupabase } from "@/lib/supabase";
import type { Post } from "@/types";
import { getMappedSlug } from "@/lib/slug-mapping";
import { StickyNav } from "@/components/layout/StickyNav";
import { TrustBadge } from "@/components/posts/TrustBadge";
import { ProcedureProgressBar } from "@/components/posts/ProcedureProgressBar";
import { ProcedureMeta } from "@/components/posts/ProcedureMeta";
import { RelatedPosts } from "@/components/posts/RelatedPosts";

const PostContent = dynamicImport(() => import("@/components/posts/PostContent").then(m => ({ default: m.PostContent })));
const TocSidebar = dynamicImport(() => import("@/components/posts/TocSidebar").then(m => ({ default: m.TocSidebar })));
const PostActions = dynamicImport(() => import("@/components/posts/PostActions").then(m => ({ default: m.PostActions })), { ssr: false });
const ShareButtons = dynamicImport(() => import("@/components/posts/ShareButtons").then(m => ({ default: m.ShareButtons })), { ssr: false });
const CommentsSection = dynamicImport(() => import("@/components/comments/CommentsSection").then(m => ({ default: m.CommentsSection })), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

// 런타임 SSR + 캐싱 최적화
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// 서버용 Supabase 클라이언트 (빌드 시점에도 데이터 가져오기 위해 anonSupabase 사용)
function getServerSupabase() {
  // 빌드 시점에도 데이터를 가져올 수 있도록 anonSupabase 우선 사용
  return anonSupabase;
}

interface PostPageProps {
  params: { slug: string };
}

// 잘못된 slug 패턴 확인
function isInvalidSlugPattern(slug: string): boolean {
  // 하이픈으로 시작
  if (slug.startsWith('-')) return true;
  // 연속된 하이픈
  if (slug.includes('--')) return true;
  // 한글 없이 숫자+하이픈만
  const hasKorean = /[\uAC00-\uD7AF]/.test(slug);
  const hasEnglish = /[a-zA-Z]/.test(slug);
  if (!hasKorean && !hasEnglish && /^[\d-]+$/.test(slug)) return true;
  return false;
}

async function getPost(slug: string): Promise<Post | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      slug,
      excerpt,
      content,
      meta_title,
      meta_description,
      cover_image,
      cover_image_alt,
      published,
      published_at,
      created_at,
      updated_at,
      view_count,
      case_type,
      current_stage,
      next_stage,
      estimated_duration,
      expert_level,
      involved_agencies,
      common_mistakes,
      tags,
      user_id,
      user:users(nickname, avatar_url, email, role)
    `)
    .eq("slug", slug)
    .eq("published", true)
    .not("published_at", "is", null)
    .single();

  if (error) {
    return null;
  }

  return data as Post;
}

// 제목으로 게시글 찾기 (slug 변경 후 301 리다이렉트용)
async function findPostByTitleGuess(slug: string): Promise<Post | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  // slug에서 숫자 추출 (타임스탬프 부분)
  const timestampMatch = slug.match(/([a-z0-9]{4,8})$/);

  if (timestampMatch) {
    // 유사한 slug 패턴을 가진 최근 게시글 검색
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        content,
        meta_title,
        meta_description,
        cover_image,
        cover_image_alt,
        published,
        published_at,
        created_at,
        updated_at,
        view_count,
        case_type,
        current_stage,
        next_stage,
        estimated_duration,
        expert_level,
        involved_agencies,
        common_mistakes,
        tags,
        user_id,
        user:users(nickname, avatar_url, email, role)
      `)
      .eq('published', true)
      .not('published_at', 'is', null)
      .ilike('slug', `%${timestampMatch[1]}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return data as Post;
    }
  }

  return null;
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
      .select(`
        id,
        title,
        slug,
        excerpt,
        cover_image,
        cover_image_alt,
        published_at,
        view_count,
        user:users(nickname),
        tags!inner(id, name, slug)
      `)
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
      .select(`
        id,
        title,
        slug,
        excerpt,
        cover_image,
        cover_image_alt,
        published_at,
        view_count,
        user:users(nickname),
        tags(id, name, slug)
      `)
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
  const postUrl = `${SITE_URL}/posts/${params.slug}`;

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  const rawDesc = post.meta_description || post.excerpt || "";
  const description = rawDesc.length >= 120
    ? rawDesc.slice(0, 155)
    : rawDesc.length > 0
      ? `${rawDesc} — ${post.title}`.slice(0, 155)
      : post.title.slice(0, 155);

  const rawTitle = post.meta_title || post.title;
  const title = rawTitle.length > 55 ? `${rawTitle.slice(0, 52)}...` : rawTitle;

  // OG 이미지 우선순위: cover_image → 본문 첫 이미지 → 동적 OG
  const contentFirstImage = post.content?.match(/!\[.*?\]\((https?:\/\/[^\s)"]+)/)?.[1] || null;
  const ogImage = post.cover_image || contentFirstImage
    ? {
        url: (post.cover_image || contentFirstImage) as string,
        width: 1200,
        height: 630,
        alt: post.cover_image_alt || post.title,
      }
    : {
        url: `${SITE_URL}/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(description)}`,
        width: 1200,
        height: 630,
        alt: post.title,
      };

  return {
    title,
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
      images: [ogImage],
      ...(post.tags && post.tags.length > 0 && {
        article: {
          section: post.tags[0]?.name,
          tag: post.tags.map((t) => t.name),
        },
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage.url],
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const decodedSlug = decodeURIComponent(params.slug);

  // 1. 정확한 매핑 테이블 확인 (가장 우선)
  const mappedSlug = getMappedSlug(decodedSlug);
  if (mappedSlug) {
    // 301 영구 리다이렉트
    permanentRedirect(`/posts/${mappedSlug}`);
  }

  // 2. 잘못된 slug 패턴 감지 시 제목 추론 시도
  if (isInvalidSlugPattern(decodedSlug)) {
    const correctPost = await findPostByTitleGuess(decodedSlug);

    if (correctPost) {
      // 301 영구 리다이렉트 (SEO 가치 전달)
      permanentRedirect(`/posts/${correctPost.slug}`);
    }
    // 찾지 못하면 404
    notFound();
  }

  const post = await getPost(decodedSlug);

  if (!post) {
    notFound();
  }

  // 관련 글 가져오기
  const relatedPosts = await getRelatedPosts(post);

  // 본문에서 첫 이미지 추출 (Article Schema용)
  const imgMatch = post.content?.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  const firstImage = post.cover_image || imgMatch?.[1] || undefined;
  const postUrl = `${SITE_URL}/posts/${post.slug}`;
  const authorName = post.user?.nickname || post.user?.email?.split('@')[0] || "익명";
  const authorEmail = post.user?.email || undefined;
  const authorAvatar = post.user?.avatar_url || `${SITE_URL}/icon.png`;

  // ArticleSchema 데이터
  const articleSchemaData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.slice(0, 110),
    description: post.excerpt || undefined,
    wordCount: post.content ? post.content.replace(/\s+/g, ' ').trim().split(' ').length : undefined,
    articleBody: post.content?.replace(/[#*`\[\]()]/g, '').replace(/!\[.*?\]\(.*?\)/g, '').slice(0, 500),
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorEmail && { email: authorEmail }),
      url: `${SITE_URL}/author`,
      image: {
        "@type": "ImageObject",
        url: authorAvatar,
        width: 512,
        height: 512,
      },
    },
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    url: postUrl,
    ...(firstImage && {
      image: [
        {
          "@type": "ImageObject",
          url: firstImage,
          width: 1200,
          height: 630,
          caption: post.cover_image_alt || post.title,
        },
      ],
    }),
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "法 BLOG",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
        width: 512,
        height: 512,
      },
      description: "법률, 기술, 비즈니스에 관한 깊이 있는 분석과 인사이트를 제공하는 블로그",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    ...(post.tags && post.tags.length > 0 && { 
      keywords: post.tags.map((t) => t.name).join(", "),
      articleSection: post.tags[0]?.name,
      about: post.tags.map((tag) => ({
        "@type": "Thing",
        name: tag.name,
      })),
    }),
    inLanguage: "ko-KR",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".subheadline", ".article-body-content p:first-of-type"],
    },
  };

  // BreadcrumbSchema 데이터
  const breadcrumbSchemaData = {
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
        name: "글 목록",
        item: `${SITE_URL}/posts`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* 조회수 증가 (클라이언트, 24시간 쿠키 중복 방지) */}
      <ViewCounter slug={post.slug} />
      {/* JSON-LD 스크립트 태그 (검색 엔진 마크업 인식용) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchemaData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchemaData) }}
      />
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
            {post.user?.role === "admin" ? (
              <Link href="/author" className="hover:text-rust transition-colors underline underline-offset-2">
                {authorName}
              </Link>
            ) : (
              <span>{authorName}</span>
            )}
            <span className="byline-sep">|</span>
            <span>
              {new Date(post.published_at || post.created_at).toLocaleDateString("ko-KR")}
            </span>
            <span className="byline-sep">|</span>
            <span>{post.view_count.toLocaleString()} 회 읽음</span>
          </div>
        </section>

        {/* Cover Image - LCP 최적화 */}
        {post.cover_image && (
          <div 
            className="max-w-content mx-auto px-4 sm:px-6 mb-8 relative bg-cream"
            style={{ aspectRatio: "16/9", maxHeight: "400px" }}
          >
            <Image
              src={post.cover_image}
              alt={post.cover_image_alt || post.title}
              fill
              className="object-cover rounded-sm"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect fill='%23ede7d7' width='16' height='9'/%3E%3C/svg%3E"
            />
          </div>
        )}

        {/* Article Content with TOC - 레이아웃 개선 */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col xl:flex-row gap-8 justify-center">
            {/* 본문 영역 */}
            <article className="flex-1 min-w-0 xl:max-w-3xl">
              {/* 절차 진행 단계 바 (절차 메타 있을 때만 표시) */}
              <ProcedureProgressBar post={post} />

              {/* 본문 내용 - max-w-article로 중앙 정렬 */}
              <div className="article-body-content">
                <PostContent contentMarkdown={post.content} />
              </div>

              {/* 절차 실무 정보 (방문 기관, 자주 하는 실수) */}
              <ProcedureMeta post={post} />

              <div className="ornament">— ✦ —</div>

              {/* 신뢰 배지 */}
              <TrustBadge
                isAiAssisted={post.is_ai_assisted ?? false}
                reviewedAt={post.reviewed_at ?? null}
                updatedAt={post.updated_at}
              />

              {/* Share */}
              <ShareButtons
                title={post.title}
                description={post.meta_description || post.excerpt || undefined}
                imageUrl={post.cover_image || undefined}
              />
            </article>

            {/* TOC 사이드바 - xl 이상에서만 표시, sticky */}
            <aside className="hidden xl:block w-72 flex-shrink-0">
              <div className="sticky top-24">
                <TocSidebar contentMarkdown={post.content} />
              </div>
            </aside>
          </div>
        </div>

        {/* Comments Section - 질문/댓글 */}
        <CommentsSection postId={post.id} postSlug={post.slug} postTitle={post.title} />

        {/* Related Posts - 이어서 읽기 */}
        <RelatedPosts posts={relatedPosts} currentPostId={post.id} />
      </main>
    </div>
  );
}
