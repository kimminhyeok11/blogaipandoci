import Link from "next/link";
import dynamicImport from "next/dynamic";
import { getTrendingSituations, getStuckStages } from "@/lib/situations";
import fs from 'fs';
import path from 'path';
import type { Metadata } from "next";

const SITE_URL_HOME = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

const ClientHeader = dynamicImport(() => import("@/components/layout/ClientHeader").then(m => ({ default: m.ClientHeader })), { ssr: false });
const SituationSearch = dynamicImport(() => import("@/components/posts/SituationSearch").then(m => ({ default: m.SituationSearch })), { ssr: false });

export const revalidate = 3600;

// 페이지 번호별 고유 메타데이터
export async function generateMetadata({ params }: { params: { index: string } }): Promise<Metadata> {
  const pageNum = parseInt(params.index, 10) || 1;
  const title = pageNum === 1 
    ? "法 BLOG - 법률, 기술, 비즈니스 깊이 있는 분석"
    : `${pageNum}페이지 | 法 BLOG - 최신 글 모음`;
  
  return {
    title,
    description: `${pageNum}페이지 - 법률, 정책, 사회 이슈에 관한 심층 분석 콘텐츠 모음.`,
    alternates: {
      canonical: pageNum === 1 ? SITE_URL_HOME : `${SITE_URL_HOME}/home/${pageNum}`,
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
  user_id: string;
  user?: { nickname: string | null; email: string | null; role?: string | null };
}


// 페이지 컴포넌트를 동기 함수로 변경하여 빌드 시점에 호출되도록 함
export default async function HomePage({ params: _params }: { params: { index: string } }) {
  const [situations, _stuckStages] = await Promise.all([
    getTrendingSituations(8),
    getStuckStages(6),
  ]);
  // 빌드 시점에 생성된 JSON 파일에서 데이터 읽기 (동기)
  let buildData;
  try {
    const dataFilePath = path.join(process.cwd(), 'public', 'build-data.json');
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    buildData = JSON.parse(fileContent);
    console.log("[BUILD DEBUG] Data loaded from build-data.json in sync function");
  } catch (err) {
    console.error("[BUILD DEBUG] Failed to load build-data.json:", err);
    buildData = { featuredPost: null, recentPosts: [] };
  }

  const { featuredPost, recentPosts } = buildData;

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
    itemListElement: recentPosts.map((p: Post, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      name: p.title,
      url: `${SITE_URL_HOME}/posts/${p.slug}`,
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
                <span suppressHydrationWarning>{featuredPost.view_count.toLocaleString()} 회 읽음</span>
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

        {/* 1층: 지금 많이 찾는 상황 */}
        <SituationSearch situations={situations} />

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
