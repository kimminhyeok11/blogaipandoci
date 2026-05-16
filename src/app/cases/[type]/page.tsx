import Link from "next/link";
import { Layers } from "lucide-react";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { StickyNav } from "@/components/layout/StickyNav";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

const VALID_CASE_TYPES = [
  "상속·유언", "채무·금전", "형사·고소", "전세·임대차",
  "이혼·가족", "계약·거래", "행정·기타",
];

const STAGE_LABELS: Record<string, { color: string; bg: string }> = {
  "상속·유언":   { color: "text-amber-800",  bg: "bg-amber-100 border-amber-200" },
  "채무·금전":   { color: "text-red-800",    bg: "bg-red-100 border-red-200" },
  "형사·고소":   { color: "text-slate-800",  bg: "bg-slate-100 border-slate-200" },
  "전세·임대차": { color: "text-blue-800",   bg: "bg-blue-100 border-blue-200" },
  "이혼·가족":   { color: "text-pink-800",   bg: "bg-pink-100 border-pink-200" },
  "계약·거래":   { color: "text-emerald-800",bg: "bg-emerald-100 border-emerald-200" },
  "행정·기타":   { color: "text-purple-800", bg: "bg-purple-100 border-purple-200" },
};

const EXPERT_BADGE: Record<string, string> = {
  "직접가능":   "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "법무사권장": "bg-amber-100 text-amber-800 border border-amber-200",
  "변호사권장": "bg-red-100 text-red-800 border border-red-200",
};

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

export async function generateMetadata({ params }: CaseTypePageProps): Promise<Metadata> {
  const caseType = decodeURIComponent(params.type);
  if (!VALID_CASE_TYPES.includes(caseType)) return {};

  return {
    title: `${caseType} 절차 안내 | 法 BLOG`,
    description: `${caseType} 관련 실제 절차 경험을 담은 글 모음입니다. 현재 단계에서 다음 단계까지 실무 정보를 확인하세요.`,
    openGraph: {
      title: `${caseType} 절차 안내 | 法 BLOG`,
      description: `${caseType} 관련 실제 절차 경험을 담은 글 모음입니다.`,
      type: "website",
      locale: "ko_KR",
      url: `${SITE_URL}/cases/${caseType}`,
      siteName: "法 BLOG",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: `${caseType} 절차 안내` }],
    },
    alternates: {
      canonical: `${SITE_URL}/cases/${caseType}`,
    },
  };
}

async function getPostsByCaseType(caseType: string): Promise<CasePost[]> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, current_stage, next_stage, expert_level, estimated_duration")
      .eq("published", true)
      .not("published_at", "is", null)
      .eq("case_type", caseType)
      .order("published_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CasePost[];
  } catch (err) {
    console.error("사건 유형별 글 조회 오류:", err);
    return [];
  }
}

export default async function CaseTypePage({ params }: CaseTypePageProps) {
  const caseType = decodeURIComponent(params.type);

  if (!VALID_CASE_TYPES.includes(caseType)) {
    notFound();
  }

  const posts = await getPostsByCaseType(caseType);
  const style = STAGE_LABELS[caseType] || { color: "text-ink", bg: "bg-cream" };

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
        name: `${caseType} 절차`,
        item: `${SITE_URL}/cases/${caseType}`,
      },
    ],
  };

  // CollectionPageSchema 데이터
  const collectionData = posts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${caseType} 절차 안내`,
    description: `${caseType} 관련 실제 절차 경험 글 ${posts.length}개`,
    url: `${SITE_URL}/cases/${encodeURIComponent(caseType)}`,
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
            <h1 className="text-2xl font-black text-ink">{caseType}</h1>
            <span className={`px-2.5 py-1 rounded-sm text-xs font-medium border ${style.bg} ${style.color}`}>
              {posts.length}건
            </span>
          </div>
          <p className="font-sans text-sm text-muted">
            실제 절차 경험을 담은 글 모음입니다. 단계별로 무엇을 해야 하는지 확인하세요.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted mb-2">
              아직 이 유형의 절차 글이 없습니다.
            </p>
            <Link href="/cases" className="font-sans text-xs text-rust hover:underline">
              다른 유형 보기 →
            </Link>
          </div>
        ) : (
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
                    <span className="font-sans text-2xs text-muted">
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
        )}
      </main>
    </div>
  );
}
