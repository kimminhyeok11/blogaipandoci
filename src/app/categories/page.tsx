import Link from "next/link";
import { Tag } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "키워드 목록 | 法 BLOG",
  description: "법률, 정책, 사회 분야별로 분류된 심층 분석 콘텐츠를 주제별로 탐색하세요. 전문가의 깊이 있는 인사이트를 제공합니다.",
  openGraph: {
    title: "키워드 목록 | 法 BLOG",
    description: "법률, 정책, 사회 분야별로 분류된 심층 분석 콘텐츠를 주제별로 탐색하세요. 전문가의 깊이 있는 인사이트를 제공합니다.",
    type: "website",
    locale: "ko_KR",
    url: "/categories",
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "法 BLOG 키워드 목록" }],
  },
  alternates: {
    canonical: "/categories",
  },
  robots: {
    index: false,
    follow: true,
  },
};

interface TagData {
  name: string;
  slug: string;
  count: number;
}

async function getTags(): Promise<TagData[]> {
  try {
    const { data: tagData, error } = await supabase
      .from("tags")
      .select("name, slug, post_tags(count)");

    if (error) throw error;

    return (tagData || [])
      .map((tag: any) => ({
        name: tag.name,
        slug: tag.slug,
        count: tag.post_tags?.[0]?.count || 0,
      }))
      .sort((a: TagData, b: TagData) => b.count - a.count);
  } catch (err) {
    console.error("Error fetching tags:", err);
    return [];
  }
}

export default async function CategoriesPage() {
  const tags = await getTags();

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
        name: "키워드",
        item: `${SITE_URL}/categories`,
      },
    ],
  };

  // CollectionPageSchema 데이터
  const collectionData = tags.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "법률 키워드 모음",
    description: "법률, 정책, 사회 이슈에 관한 전문적인 분석 콘텐츠를 키워드별로 탐색",
    url: `${SITE_URL}/categories`,
    isPartOf: {
      "@type": "WebSite",
      name: "法 BLOG",
      url: SITE_URL,
    },
    itemListElement: tags.map((tag, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `#${tag.name}`,
      url: `${SITE_URL}/tags/${encodeURIComponent(tag.name)}`,
      description: `${tag.count}개의 전문 분석 글`,
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
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Tag className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">법률 키워드</h1>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="font-sans text-sm text-muted leading-relaxed mb-4">
              실생활에서 마주할 수 있는 법률 문제들을 중심으로, 전문적인 시각에서 심층 분석한 콘텐츠들을 키워드별로 정리했습니다.
              각 키워드는 해당 분야의 실제 사례와 법적 해결책을 다루어, 법률 지식이 없는 분들도 쉽게 이해할 수 있습니다.
            </p>
            <div className="bg-cream/40 border border-rule rounded-lg p-6 mb-6">
              <h2 className="font-sans text-base font-semibold text-ink mb-3">전문 분야 안내</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h3 className="font-medium text-ink mb-2">🔍 사례 중심 분석</h3>
                  <p className="text-muted">실제 판례와 사례를 통해 법률 문제의 실질적인 해결책 제시</p>
                </div>
                <div>
                  <h3 className="font-medium text-ink mb-2">📊 절차 가이드</h3>
                  <p className="text-muted">소송, 협의, 행정절차 등 단계별 진행 방법 상세 안내</p>
                </div>
                <div>
                  <h3 className="font-medium text-ink mb-2">⚖️ 전문가 조언</h3>
                  <p className="text-muted">변호사, 법무사 등 전문가의 실무 경험을 바탕 한 실용적 정보</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-sans text-sm font-medium text-blue-900 mb-2">💡 이용 가이드</h3>
              <ul className="font-sans text-xs text-blue-800 space-y-1">
                <li>• 관심 있는 키워드를 클릭하여 해당 분야의 모든 글을 확인하세요</li>
                <li>• 각 글은 실제 사례를 바탕으로 작성되어 실용적인 정보를 제공합니다</li>
                <li>• 법률 자문이 아닌 일반 정보 제공 목적이며, 구체적인 문제는 전문가와 상담하세요</li>
              </ul>
            </div>
            <p className="font-sans text-xs text-muted">
              총 {tags.length}개의 전문 키워드가 있으며, 현재 {tags.reduce((sum, tag) => sum + tag.count, 0)}개의 심층 분석 글이 제공됩니다.
            </p>
          </div>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted">
              아직 등록된 키워드가 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 인기 키워드 상위 10개 */}
            <div>
              <h2 className="font-sans text-lg font-semibold text-ink mb-4">🔥 인기 키워드</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {tags.slice(0, 10).map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/tags/${encodeURIComponent(tag.name)}`}
                    className="group flex items-center gap-2 px-3 py-2 bg-rust/5 border border-rust/20 rounded-lg hover:border-rust hover:bg-rust/10 transition-all"
                  >
                    <span className="text-rust text-sm">#</span>
                    <span className="font-sans text-sm text-ink group-hover:text-rust transition-colors truncate">
                      {tag.name}
                    </span>
                    <span className="font-sans text-xs text-muted bg-rust/10 px-1.5 py-0.5 rounded ml-auto">
                      {tag.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 전체 키워드 목록 */}
            <div>
              <h2 className="font-sans text-lg font-semibold text-ink mb-4">📋 전체 키워드</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/tags/${encodeURIComponent(tag.name)}`}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-cream/30 border border-rule rounded-full hover:border-rust hover:bg-rust/5 transition-all"
                  >
                    <span className="text-rust text-xs">#</span>
                    <span className="font-sans text-xs text-ink group-hover:text-rust transition-colors">
                      {tag.name}
                    </span>
                    <span className="font-sans text-xs text-muted bg-cream px-1.5 py-0.5 rounded">
                      {tag.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
