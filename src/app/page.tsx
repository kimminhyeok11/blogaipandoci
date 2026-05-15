import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getServiceSupabase, supabase as anonSupabase } from "@/lib/supabase";

const SITE_URL_HOME = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

const ClientHeader = dynamic(() => import("@/components/layout/ClientHeader").then(m => ({ default: m.ClientHeader })), { ssr: false });
const AdSense = dynamic(() => import("@/components/ads/AdSense").then(m => ({ default: m.AdSense })), { ssr: false });
const SituationSearch = dynamic(() => import("@/components/posts/SituationSearch").then(m => ({ default: m.SituationSearch })), { ssr: false });

// ISR: 1시간마다 재생성
export const revalidate = 3600;

interface Post {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
  user_id: string;
  user?: { nickname: string | null; email: string | null; role?: string | null };
}

function getSupabase() {
  try { return getServiceSupabase(); } catch { return anonSupabase; }
}

async function getPosts() {
  const supabase = getSupabase();
  try {
    // Popular posts (by view count)
    const { data: popularPosts } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id, user:users(nickname, email, role)")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("view_count", { ascending: false })
      .limit(1);

    // Latest posts (by date)
    const { data: latestPosts } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id, user:users(nickname, email, role)")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(10);

    return {
      featuredPost: popularPosts?.[0] || null,
      recentPosts: latestPosts || []
    };
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    return { featuredPost: null, recentPosts: [] };
  }
}

export default async function HomePage() {
  const { featuredPost, recentPosts } = await getPosts();

  // BreadcrumbSchema 데이터
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE_URL_HOME,
      },
    ],
  };

  // WebSiteSchema 데이터
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "法 BLOG",
    url: SITE_URL_HOME,
    description: "법률, 정책, 사회 이슈에 관한 심층 분석 콘텐츠",
    image: `${SITE_URL_HOME}/opengraph-image.png`,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL_HOME}/posts?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // ItemListSchema 데이터
  const itemListData = recentPosts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "法 BLOG 최신 분석 글",
    description: "법률, 정책, 사회 이슈에 관한 최신 심층 분석 글 모음",
    itemListElement: recentPosts.map((p: Post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: p.title,
      url: `${SITE_URL_HOME}/posts/${encodeURIComponent(p.slug)}`,
      description: p.excerpt || undefined,
      datePublished: p.published_at,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
        suppressHydrationWarning
      />
      {itemListData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
          suppressHydrationWarning
        />
      )}

      {/* Client Header with Auth and Scroll Effects */}
      <ClientHeader />

      {/* Spacer for fixed header */}
      <div className="h-[180px]" />

      <main>
        {/* Hero Section - Featured Post */}
        {featuredPost ? (
          <section className="relative min-h-[60vh] flex items-center justify-center px-4 sm:px-6 py-16 border-b border-rule">
            <div className="max-w-content mx-auto text-center">
              <div className="section-label">심층 분석</div>
              <h1 className="headline">
                {featuredPost.title.split(",")[0] || featuredPost.title},
                <br />
                <em>{featuredPost.title.split(",")[1]?.trim() || "인기 글"}</em>
              </h1>
              <p className="subheadline">{featuredPost.excerpt}</p>
              <div className="byline">
                {featuredPost.user?.role === "admin" ? (
                  <Link href="/author" className="hover:text-rust transition-colors underline underline-offset-2">
                    {featuredPost.user?.nickname || featuredPost.user?.email?.split("@")[0] || "익명"}
                  </Link>
                ) : (
                  <span>{featuredPost.user?.nickname || featuredPost.user?.email?.split("@")[0] || "익명"}</span>
                )}
                <span className="byline-sep">|</span>
                <span suppressHydrationWarning>
                  {new Date(featuredPost.published_at).toLocaleDateString("ko-KR")}
                </span>
                <span className="byline-sep">|</span>
                <span>{featuredPost.view_count.toLocaleString()} 회 읽음</span>
              </div>
              <Link
                href={`/posts/${featuredPost.slug}`}
                className="btn-outline mt-6 tracking-wider uppercase"
                aria-label={`${featuredPost.title} 자세히 읽기`}
              >
                자세히 읽기
              </Link>
            </div>
          </section>
        ) : (
          <section className="relative min-h-[40vh] flex items-center justify-center px-4 sm:px-6 py-16 border-b border-rule">
            <div className="max-w-content mx-auto text-center">
              <div className="section-label">Welcome</div>
              <h1 className="headline">
                法 BLOG,
                <br />
                <em>Deep Analysis</em>
              </h1>
              <p className="subheadline">아직 발행된 글이 없습니다.</p>
            </div>
          </section>
        )}

        {/* 상황 탐색 */}
        <SituationSearch />

        {/* Recent Posts */}
        <section className="max-w-content mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-sans text-xs font-medium tracking-widest uppercase text-muted">
              최신 글
            </h2>
            <div className="flex-1 h-px bg-rule"></div>
          </div>

          <div className="grid gap-8">
            {recentPosts.map((post: Post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-8 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-2xs tracking-wider uppercase text-rust">
                      심층 분석
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted" suppressHydrationWarning>
                      {new Date(post.published_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {post.user?.role === "admin" ? (
                        <Link href="/author" className="hover:text-rust transition-colors underline underline-offset-2">
                          {post.user?.nickname || post.user?.email?.split("@")[0] || "익명"}
                        </Link>
                      ) : (
                        post.user?.nickname || post.user?.email?.split("@")[0] || "익명"
                      )}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-2 group-hover:text-rust transition-colors">
                    {post.title}
                  </h3>
                  <p className="font-sans text-sm text-muted leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>

          {/* 광고 - 지연 로딩 */}
          <div className="my-12" style={{ minHeight: "250px" }}>
            <Suspense fallback={<div className="w-full h-[250px] bg-cream rounded animate-pulse" />}>
              <AdSense
                slot="7498833217"
                format="auto"
                minHeight={250}
              />
            </Suspense>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/posts"
              className="btn-primary"
            >
              모든 글 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
