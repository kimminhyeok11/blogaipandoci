import Link from "next/link";
import { Suspense } from "react";
import dynamicImport from "next/dynamic";
import { getServiceSupabase, supabase as anonSupabase } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

const SITE_URL_HOME = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

const ClientHeader = dynamicImport(() => import("@/components/layout/ClientHeader").then(m => ({ default: m.ClientHeader })), { ssr: false });
const SituationSearch = dynamicImport(() => import("@/components/posts/SituationSearch").then(m => ({ default: m.SituationSearch })), { ssr: false });

// SSR: 서버 사이드 렌더링 사용
export const dynamic = 'force-dynamic';

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
  // 빌드 시점에도 데이터를 가져올 수 있도록 직접 클라이언트 생성
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables not set");
    return null;
  }

  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseAnonKey);
}

async function getPosts() {
  console.log("[BUILD DEBUG] getPosts called");

  // 빌드 시점에 생성된 JSON 파일에서 데이터 읽기
  try {
    const dataFilePath = path.join(process.cwd(), 'public', 'build-data.json');
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    const buildData = JSON.parse(fileContent);

    console.log("[BUILD DEBUG] Data loaded from build-data.json");
    console.log("[BUILD DEBUG] Featured post:", buildData.featuredPost?.title || 'None');
    console.log("[BUILD DEBUG] Recent posts count:", buildData.recentPosts.length);

    return {
      featuredPost: buildData.featuredPost,
      recentPosts: buildData.recentPosts
    };
  } catch (err) {
    console.error("[BUILD DEBUG] Failed to load build-data.json:", err);

    // JSON 파일이 없으면 Supabase에서 직접 가져오기 (런타임 fallback)
    const supabase = getSupabase();
    if (!supabase) {
      console.error("[BUILD DEBUG] Supabase client not available");
      return { featuredPost: null, recentPosts: [] };
    }

    try {
      const { data: popularPosts } = await supabase
        .from("posts")
        .select("id, title, excerpt, slug, published_at, view_count, user_id, user:users(nickname, email, role)")
        .eq("published", true)
        .not("published_at", "is", null)
        .order("view_count", { ascending: false })
        .limit(1);

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
    } catch (supabaseErr) {
      console.error("[BUILD DEBUG] Failed to fetch from Supabase:", supabaseErr);
      return { featuredPost: null, recentPosts: [] };
    }
  }
}

// 페이지 컴포넌트를 동기 함수로 변경하여 빌드 시점에 호출되도록 함
export default function HomePage({ params }: { params: { index: string } }) {
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
