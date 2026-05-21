import Link from "next/link";
import { Tag } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

interface TagData {
  id: string;
  name: string;
  slug: string;
}

// ISR: 1시간마다 재생성
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "태그 목록 | 法 BLOG",
  description: "法 BLOG의 모든 태그 목록입니다. 법률, 정책, 사회 분야별로 분류된 심층 분석 콘텐츠를 주제별로 탐색하세요.",
  openGraph: {
    title: "태그 목록 | 法 BLOG",
    description: "法 BLOG의 모든 태그 목록입니다. 법률, 정책, 사회 분야별로 분류된 심층 분석 콘텐츠를 주제별로 탐색하세요.",
    type: "website",
    locale: "ko_KR",
    url: "/tags",
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "法 BLOG 태그 목록" }],
  },
  alternates: {
    canonical: "/tags",
  },
};

interface TagData {
  name: string;
  slug: string;
  count: number;
}

async function getTags(): Promise<TagData[]> {
  try {
    // 1. 태그 목록 조회
    const { data: tagData, error } = await supabase
      .from("tags")
      .select("id, name, slug");

    if (error) throw error;
    if (!tagData) return [];

    // 2. 각 태그별 글 개수 별도 조회 (PostgREST relation 대신 안전한 방식)
    const tagsWithCount = await Promise.all(
      tagData.map(async (tag: TagData) => {
        const { count, error: countError } = await supabase
          .from("post_tags")
          .select("*", { count: "exact", head: true })
          .eq("tag_id", tag.id);
        
        if (countError) {
          console.error(`[getTags] Count error for tag ${tag.slug}:`, countError);
        }
        
        return {
          name: tag.name,
          slug: tag.slug,
          count: count || 0,
        };
      })
    );

    return tagsWithCount.sort((a, b) => b.count - a.count);
  } catch (err) {
    console.error("[getTags] Failed to fetch tags:", err);
    return [];
  }
}

export default async function TagsPage() {
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
        name: "태그",
        item: `${SITE_URL}/tags`,
      },
    ],
  };

  // CollectionPageSchema 데이터
  const collectionData = tags.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "모든 태그",
    description: "法 BLOG의 모든 태그 목록",
    url: `${SITE_URL}/tags`,
    isPartOf: {
      "@type": "WebSite",
      name: "法 BLOG",
      url: SITE_URL,
    },
    itemListElement: tags.map((tag, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `#${tag.name}`,
      url: `${SITE_URL}/tags/${tag.slug}`,
      description: `${tag.count}개의 글`,
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
            <h1 className="text-2xl font-black text-ink">태그</h1>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="font-sans text-sm text-muted leading-relaxed mb-4">
              법률, 정책, 사회 이슈에 관한 심층 분석 콘텐츠를 주제별로 쉽게 찾아보세요. 
              각 태그는 해당 분야의 핵심 주제를 다루는 글들을 모아두어 관련 정보를 체계적으로 탐색할 수 있습니다.
            </p>
            <div className="bg-cream/40 border border-rule rounded-lg p-6 mb-6">
              <h2 className="font-sans text-base font-semibold text-ink mb-3">주요 태그 분야</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium text-ink mb-2">💰 금융·채무</h3>
                  <p className="text-muted">대출 연체, 개인회생, 파산, 채권추심 등 금융 관련 법률 문제</p>
                </div>
                <div>
                  <h3 className="font-medium text-ink mb-2">🏠 부동산·임대차</h3>
                  <p className="text-muted">전세보증금, 임대차 계약, 경매, 주택 관련 분쟁 해결</p>
                </div>
                <div>
                  <h3 className="font-medium text-ink mb-2">⚖️ 형사·고소</h3>
                  <p className="text-muted">명예훼손, 고소고발, 처벌법, 범죄 피해 구제 절차</p>
                </div>
                <div>
                  <h3 className="font-medium text-ink mb-2">👥 가족·상속</h3>
                  <p className="text-muted">이혼, 상속, 친생자관계, 가족법 관련 법률 문제 해결</p>
                </div>
              </div>
            </div>
            <p className="font-sans text-xs text-muted">
              총 {tags.length}개의 태그가 있으며, 관심 있는 주제를 클릭하여 해당 분야의 전문적인 분석 글들을 읽어보세요.
            </p>
          </div>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted">
              아직 태그가 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                href={`/tags/${tag.slug}`}
                className="group flex items-center gap-2 px-4 py-2 bg-cream/30 border border-rule rounded-full hover:border-rust hover:bg-rust/5 transition-all"
              >
                <span className="text-rust">#</span>
                <span className="font-sans text-sm text-ink group-hover:text-rust transition-colors">
                  {tag.name}
                </span>
                <span className="font-sans text-xs text-muted bg-cream px-1.5 py-0.5 rounded">
                  {tag.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
