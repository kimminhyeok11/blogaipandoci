import Link from "next/link";
import { Layers } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";
import { getServiceSupabase } from "@/lib/supabase";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "사건 유형별 절차 안내 | 法 BLOG",
  description: "형사, 민사, 이혼·가족, 노동, 부동산, 학교폭력, 지식재산권, 교통사고, 회생·파산 등 사건 유형별로 정리된 법률 절차 경험 글 모음입니다.",
  openGraph: {
    title: "사건 유형별 절차 안내 | 法 BLOG",
    description: "형사, 민사, 이혼·가족, 노동, 부동산, 학교폭력, 지식재산권, 교통사고, 회생·파산 등 사건 유형별로 정리된 법률 절차 경험 글 모음입니다.",
    type: "website",
    locale: "ko_KR",
    url: `${SITE_URL}/cases`,
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "사건 유형별 절차 안내" }],
  },
  alternates: {
    canonical: `${SITE_URL}/cases`,
  },
};

const CASE_TYPE_META: Record<string, { emoji: string; desc: string }> = {
  "형사":       { emoji: "⚖️", desc: "고소장 접수, 경찰 조사, 검찰 송치 등 형사 절차 경험" },
  "민사":       { emoji: "�", desc: "소송, 지급명령, 압류 등 민사 절차 경험" },
  "이혼-가족":   { emoji: "👨‍👩‍👧", desc: "협의이혼, 양육권, 재산분할 등 가족 관련 절차 경험" },
  "노동":       { emoji: "💼", desc: "부당해고, 임금체불, 산재보상 등 노동 분쟁 절차 경험" },
  "부동산":     { emoji: "🏠", desc: "임대차, 매매, 경매 등 부동산 절차 경험" },
  "학교폭력":   { emoji: "�", desc: "학교폭력 실태조사, 가해 학생 처분 등 절차 경험" },
  "지식재산권": { emoji: "💡", desc: "저작권, 특허, 상표권 등 지식재산권 절차 경험" },
  "교통사고":   { emoji: "🚗", desc: "음주운전, 12대 중과실, 보험사 대응 등 교통사고 절차 경험" },
  "회생-파산":  { emoji: "💳", desc: "개인회생, 파산 신청, 채무 조정 등 절차 경험" },
  "채무-금전":   { emoji: "�", desc: "지급명령, 통장압류, 재산조회 등 채무 관련 절차 경험" },
  "전세-임대차": { emoji: "🏡", desc: "임차권등기, 전세금 반환, 명도소송 등 임대차 절차 경험" },
  "계약-거래":   { emoji: "�", desc: "계약해제, 손해배상, 내용증명 등 계약 분쟁 절차 경험" },
  "행정-기타":   { emoji: "🏛️", desc: "행정심판, 이의신청 등 행정 절차 및 기타 경험" },
  "기타":       { emoji: "📌", desc: "기타 법률 문제 및 절차 경험" },
};

interface CaseCount {
  case_type: string;
  slug: string;
  count: number;
}

async function getCaseCounts(): Promise<CaseCount[]> {
  try {
    const supabase = getServiceSupabase();
    // categories 테이블 기준으로 집계 (category_id 기반)
    const { data, error } = await supabase
      .from("posts")
      .select("category_id, categories!inner(name, slug)")
      .eq("published", true)
      .not("published_at", "is", null)
      .not("category_id", "is", null) as { data: Array<{ categories: { name: string; slug: string } | null }> | null; error: Error | null };

    if (error) throw error;

    const counts: Record<string, { count: number; slug: string; name: string }> = {};
    for (const row of data || []) {
      const category = row.categories;
      if (category) {
        const categoryName = category.name;
        const categorySlug = category.slug;
        if (categoryName && categorySlug) {
          if (!counts[categorySlug]) {
            counts[categorySlug] = { count: 0, slug: categorySlug, name: categoryName };
          }
          counts[categorySlug].count += 1;
        }
      }
    }

    return Object.entries(counts)
      .map(([slug, { count, name }]) => ({ case_type: name, slug, count }))
      .sort((a, b) => b.count - a.count);
  } catch (err) {
    console.error("사건 유형 집계 오류:", err);
    return [];
  }
}

export default async function CasesPage() {
  const caseCounts = await getCaseCounts();

  // 글이 없는 유형도 표시 (0건 회색 처리)
  const allTypes = Object.keys(CASE_TYPE_META).map((key) => {
    const caseCount = caseCounts.find((c) => c.slug === key);
    return {
      case_type: key,
      slug: caseCount?.slug || key,
      count: caseCount?.count || 0,
    };
  });

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
    ],
  };

  // CollectionPageSchema 데이터
  const collectionData = caseCounts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "사건 유형별 절차 안내",
    description: "사건 유형별로 정리된 법률 절차 경험 글 모음",
    url: `${SITE_URL}/cases`,
    isPartOf: {
      "@type": "WebSite",
      name: "法 BLOG",
      url: SITE_URL,
    },
    itemListElement: caseCounts.map((c, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${c.case_type} 절차 안내`,
      url: `${SITE_URL}/cases/${c.slug}`,
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

      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">사건 유형별 절차 안내</h1>
          </div>
          <p className="font-sans text-sm text-muted">
            내 상황과 비슷한 사건 유형을 선택하면, 실제 절차 경험을 담은 글을 모아서 볼 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allTypes.map(({ case_type, slug, count }) => {
            const meta = CASE_TYPE_META[case_type];
            const hasContent = count > 0;

            const cardContent = (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{meta?.emoji}</span>
                  <div>
                    <p className={`font-bold text-base transition-colors ${hasContent ? "text-ink group-hover:text-rust" : "text-muted"}`}>
                      {case_type}
                    </p>
                    <p className="font-sans text-xs text-muted mt-0.5 leading-relaxed">
                      {meta?.desc}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 font-sans text-xs font-medium px-2 py-1 rounded-sm border ${
                  hasContent
                    ? "text-rust border-rust/30 bg-rust/5"
                    : "text-muted/50 border-rule/30 bg-cream/40"
                }`}>
                  {count}건
                </span>
              </div>
            );

            return hasContent ? (
              <Link
                key={case_type}
                href={`/cases/${slug}`}
                className="group p-5 border border-rule rounded-sm transition-all hover:border-rust hover:shadow-sm bg-paper cursor-pointer"
              >
                {cardContent}
              </Link>
            ) : (
              <div
                key={case_type}
                className="p-5 border border-rule/40 rounded-sm bg-cream/20 opacity-60 cursor-default"
                aria-label={`${case_type} - 아직 글 없음`}
              >
                {cardContent}
              </div>
            );
          })}
        </div>

        {caseCounts.length === 0 && (
          <p className="text-center font-sans text-sm text-muted mt-8">
            아직 절차 정보가 입력된 글이 없습니다. 글 작성 시 &apos;절차 정보&apos;를 입력해 주세요.
          </p>
        )}
      </main>
    </div>
  );
}
