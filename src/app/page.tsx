import Link from "next/link";
import dynamicImport from "next/dynamic";
import { getTrendingSituations, getStuckStages } from "@/lib/situations";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

const SITE_URL_HOME = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

const ClientHeader = dynamicImport(() => import("@/components/layout/ClientHeader").then(m => ({ default: m.ClientHeader })), { ssr: false });
const SituationSearch = dynamicImport(() => import("@/components/posts/SituationSearch").then(m => ({ default: m.SituationSearch })), { ssr: false });

// 홈페이지 메타데이터 (SEO: 동일 제목 문제 해결)
export const metadata: Metadata = {
  title: "法 BLOG - 법률, 기술, 비즈니스 깊이 있는 분석",
  description: "법률, 정책, 사회 이슈에 관한 심층 분석 콘텐츠. 실제 판례와 데이터를 기반으로 한 현실적인 인사이트를 제공합니다.",
  alternates: {
    canonical: SITE_URL_HOME,
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Post {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
  user_id: string;
  current_stage: string | null;
  case_type: string | null;
  user?: { nickname: string | null; email: string | null; role?: string | null };
}

async function getPosts() {
  try {
    console.log("[DEBUG] getPosts started");
    // posts 조회 (users는 별도로 가져와서 매핑)
    const { data: popularPosts, error: popError } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id, current_stage, case_type")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("view_count", { ascending: false })
      .limit(1);

    const { data: latestPosts, error: lateError } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id, current_stage, case_type")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(10);

    console.log("[DEBUG] popularPosts count:", popularPosts?.length || 0);
    console.log("[DEBUG] latestPosts count:", latestPosts?.length || 0);
    if (popError) console.error("Popular posts error:", popError);
    if (lateError) console.error("Latest posts error:", lateError);

    // user_id 목록 수집
    const allPosts = [...(popularPosts || []), ...(latestPosts || [])];
    console.log("[DEBUG] allPosts sample:", allPosts[0]);
    const uniqueUserIds = new Set<string>();
    allPosts.forEach((post: { user_id?: string }) => {
      if (post.user_id) uniqueUserIds.add(post.user_id);
    });
    const userIds = Array.from(uniqueUserIds);
    console.log("[DEBUG] userIds:", userIds);

    // users 별도 조회
    type UserInfo = { nickname: string | null; email: string | null; role: string | null };
    const usersMap: Record<string, UserInfo> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, nickname, email, role")
        .in("id", userIds);

      console.log("[DEBUG] users fetched:", users?.length || 0);
      if (users) {
        (users as { id: string; nickname: string | null; email: string | null; role: string | null }[]).forEach((user) => {
          usersMap[user.id] = { nickname: user.nickname, email: user.email, role: user.role };
        });
      }
      console.log("[DEBUG] usersMap:", Object.keys(usersMap));
    }

    // posts에 user 매핑
    const mapPostWithUser = (post: any): Post => ({
      ...post,
      user: usersMap[post.user_id] || null
    });

    const featuredPost = popularPosts?.[0] ? mapPostWithUser(popularPosts[0]) : null;
    const recentPosts = (latestPosts || []).map(mapPostWithUser);

    console.log("[DEBUG] Featured post user:", featuredPost?.user);
    console.log("[DEBUG] Recent posts users:", recentPosts.map((p: Post) => ({ title: p.title.slice(0, 20), user: p.user })));

    return { featuredPost, recentPosts };
  } catch (err) {
    console.error("Failed to fetch posts:", err);
    return { featuredPost: null, recentPosts: [] };
  }
}

export default async function HomePage() {
  const { featuredPost, recentPosts } = await getPosts();
  const [situations, stuckStages] = await Promise.all([
    getTrendingSituations(8),
    getStuckStages(6),
  ]);

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
                {featuredPost.user ? (
                  featuredPost.user.role === "admin" ? (
                    <Link href="/author" className="hover:text-rust transition-colors underline underline-offset-2" title="작성자 정보 보기">
                      {featuredPost.user.nickname || featuredPost.user.email?.split("@")[0] || "관리자"}
                    </Link>
                  ) : (
                    <span>{featuredPost.user.nickname || featuredPost.user.email?.split("@")[0] || "기고가"}</span>
                  )
                ) : (
                  <span className="text-muted">작성자 정보 없음</span>
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

        {/* 1층: 지금 많이 찾는 상황 (DB 기반 동적 버튼) */}
        <SituationSearch situations={situations} />

        {/* 2층: 지금 많이 막히는 절차 */}
        {stuckStages.length > 0 && (
          <section className="border-b border-rule py-10 px-4 sm:px-6">
            <div className="max-w-content mx-auto">
              <p className="font-sans text-xs font-medium tracking-widest uppercase text-muted mb-4 text-center">
                지금 많이 막히는 절차
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {stuckStages.map((s) => (
                  <Link
                    key={s.current_stage}
                    href={s.case_type ? `/cases/${s.case_type}` : `/search?q=${encodeURIComponent(s.current_stage)}`}
                    className="font-sans text-xs text-muted border border-rule/40 rounded-sm px-3 py-1.5 hover:border-rust hover:text-rust transition-colors"
                  >
                    {s.current_stage}
                    {s.post_count > 1 && (
                      <span className="ml-1 text-rust/60">{s.post_count}건</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

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
                    {post.current_stage ? (
                      <span className="font-sans text-2xs font-medium text-rust border border-rust/30 rounded-sm px-2 py-0.5 bg-rust/5">
                        {post.current_stage}
                      </span>
                    ) : (
                      <span className="font-mono text-2xs tracking-wider uppercase text-rust">
                        {post.case_type || "심층 분석"}
                      </span>
                    )}
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted" suppressHydrationWarning>
                      {new Date(post.published_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {post.user ? (
                        post.user.role === "admin" ? (
                          <Link href="/author" className="hover:text-rust transition-colors underline underline-offset-2" title="작성자 정보 보기">
                            {post.user.nickname || post.user.email?.split("@")[0] || "관리자"}
                          </Link>
                        ) : (
                          post.user.nickname || post.user.email?.split("@")[0] || "기고가"
                        )
                      ) : (
                        <span className="text-muted/60">작성자 미상</span>
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
