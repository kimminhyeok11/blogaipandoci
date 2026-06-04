import { cache } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { StickyNav } from "@/components/layout/StickyNav";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

// 정적 파라미터 생성 - 활성화된 카테고리 슬러그 목록
export async function generateStaticParams() {
  const supabase = getServiceSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);

  return ((categories as { slug: string }[] | null) || []).map((cat) => ({
    type: cat.slug,
  }));
}

// generateStaticParams에 없는 slug도 런타임에 처리
export const dynamicParams = true;

// DB 기반 category 스타일 매핑 (slug → 스타일)
// 한글 slug로 통일
const CATEGORY_STYLES: Record<string, { color: string; bg: string }> = {
  "형사":              { color: "text-slate-800",  bg: "bg-slate-100 border-slate-200" },
  "민사":              { color: "text-blue-800",   bg: "bg-blue-100 border-blue-200" },
  "이혼·가족":          { color: "text-pink-800",   bg: "bg-pink-100 border-pink-200" },
  "노동":              { color: "text-purple-800", bg: "bg-purple-100 border-purple-200" },
  "부동산":             { color: "text-emerald-800",bg: "bg-emerald-100 border-emerald-200" },
  "학교폭력":            { color: "text-red-800",    bg: "bg-red-100 border-red-200" },
  "지식재산권":          { color: "text-amber-800",  bg: "bg-amber-100 border-amber-200" },
  "교통사고":            { color: "text-orange-800", bg: "bg-orange-100 border-orange-200" },
  "회생·파산":           { color: "text-cyan-800",   bg: "bg-cyan-100 border-cyan-200" },
  "채무·금전":           { color: "text-teal-800",   bg: "bg-teal-100 border-teal-200" },
  "전세·임대차":          { color: "text-indigo-800", bg: "bg-indigo-100 border-indigo-200" },
  "계약·거래":           { color: "text-lime-800",   bg: "bg-lime-100 border-lime-200" },
  "행정·기타":           { color: "text-gray-800",   bg: "bg-gray-100 border-gray-200" },
  "기타":               { color: "text-zinc-800",   bg: "bg-zinc-100 border-zinc-200" },
};

const DEFAULT_STYLE = { color: "text-ink", bg: "bg-cream" };

const EXPERT_BADGE: Record<string, string> = {
  "직접가능":   "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "법무사권장": "bg-amber-100 text-amber-800 border border-amber-200",
  "변호사권장": "bg-red-100 text-red-800 border border-red-200",
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  post_count: number;
}

interface CasePost {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  published_at: string;
  view_count: number;
  current_stage: string | null;
  next_stage: string | null;
  expert_level: string | null;
  estimated_duration: string | null;
}

interface CaseTypePageProps {
  params: { type: string };
}

// DB에서 category 존재 여부 확인
const getCategoryBySlug = cache(async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, seo_title, seo_description, post_count")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error(`[getCategoryBySlug] Category not found: ${slug}`, error);
      return null;
    }

    return data as Category;
  } catch (err) {
    console.error(`[getCategoryBySlug] Error: ${slug}`, err);
    return null;
  }
});

// category_id 기반으로 posts 조회
const getPostsByCategoryId = cache(async function getPostsByCategoryId(categoryId: string): Promise<CasePost[]> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, current_stage, next_stage, expert_level, estimated_duration")
      .eq("published", true)
      .not("published_at", "is", null)
      .eq("category_id", categoryId)
      .order("published_at", { ascending: false })
      .order("published_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CasePost[];
  } catch (err) {
    console.error("사건 유형별 글 조회 오류:", err);
    return [];
  }
});

export async function generateMetadata({ params }: CaseTypePageProps): Promise<Metadata> {
  const slug = decodeURIComponent(params.type);
  const category = await getCategoryBySlug(slug);

  if (!category) return {};

  const posts = await getPostsByCategoryId(category.id);
  const topPost = [...posts].sort((a, b) => b.view_count - a.view_count)[0];
  
  // DB의 SEO 메타 사용, 없으면 기본값
  const title = category.seo_title || `${category.name} 절차 안내 | 法 BLOG`;
  const description = posts.length > 0
    ? `${category.name} 실제 절차 경험 ${posts.length}건. 「${topPost?.title.slice(0, 30) ?? category.name}」 등 단계별 실무 정보.`
    : (category.seo_description || `${category.name} 관련 실제 절차 경험을 담은 글 모음입니다.`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      url: `${SITE_URL}/cases/${slug}`,
      siteName: "法 BLOG",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: `${category.name} 절차 안내` }],
    },
    alternates: {
      canonical: `${SITE_URL}/cases/${slug}`,
    },
  };
}

export default async function CaseTypePage({ params }: CaseTypePageProps) {
  const slug = decodeURIComponent(params.type);

  // ✅ DB 기반 category 존재 여부 확인 (하드코딩 상수 제거)
  const category = await getCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  const posts = await getPostsByCategoryId(category.id);

  // ✅ 글이 없어도 404 아님 - 빈 상태 페이지 표시
  // (soft 404 방지, 사용자가 직접 글 쓸 수 있는 진입점 제공)
  const hasPosts = posts.length > 0;

  const style = CATEGORY_STYLES[slug] ?? DEFAULT_STYLE;
  
  // [CategoryFallback] 로깅 (transitional mode)
  if (!CATEGORY_STYLES[slug]) {
    console.warn('[CategoryFallback] Unknown slug:', slug, '- using default style');
  }

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
        name: "사건 유형별 안내",
        item: `${SITE_URL}/cases`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${category.name} 절차`,
        item: `${SITE_URL}/cases/${slug}`,
      },
    ],
  };

  // CollectionPageSchema 데이터
  const collectionData = posts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} 절차 안내`,
    description: `${category.name} 관련 실제 절차 경험 글 ${posts.length}개`,
    url: `${SITE_URL}/cases/${slug}`,
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

      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      <StickyNav backHref="/cases" backLabel="모든 사건 유형" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">{category.name}</h1>
            <span className={`px-2.5 py-1 rounded-sm text-xs font-medium border ${style.bg} ${style.color}`}>
              {posts.length}건
            </span>
          </div>
          <p className="font-sans text-sm text-muted">
            실제 절차 경험을 담은 글 모음입니다. 단계별로 무엇을 해야 하는지 확인하세요.
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
                    {/* 절차 단계 진행 표시 */}
                    {(post.current_stage || post.next_stage) && (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {post.current_stage && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs border ${style.bg} ${style.color}`}>
                            {post.current_stage}
                          </span>
                        )}
                        {post.current_stage && post.next_stage && (
                          <span className="text-muted text-xs">→</span>
                        )}
                        {post.next_stage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs border border-rule/40 text-muted bg-cream/40">
                            {post.next_stage}
                          </span>
                        )}
                        {post.expert_level && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${EXPERT_BADGE[post.expert_level] || "bg-cream/40 text-muted"}`}>
                            {post.expert_level}
                          </span>
                        )}
                        {post.estimated_duration && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs border border-rule/30 text-muted bg-cream/20">
                            약 {post.estimated_duration}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 날짜 + 조회수 */}
                    <div className="flex items-center gap-3 mb-2">
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
          /* 빈 상태 - 글이 없는 경우 */
          <div className="text-center py-16 border-2 border-dashed border-rule/50 rounded-sm">
            <Layers className="mx-auto text-muted/40 mb-4" size={48} />
            <h3 className="text-lg font-bold text-ink mb-2">
              아직 등록된 {category.name} 글이 없습니다
            </h3>
            <p className="text-muted text-sm mb-6 max-w-md mx-auto">
              이 유형의 실제 절차 경험을 공유해 주세요. 다른 사람들에게 큰 도움이 됩니다.
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
