import Link from "next/link";
import { Tag } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

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
    console.error("Failed to fetch tags:", err);
    return [];
  }
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className="min-h-screen bg-paper">
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">태그</h1>
          </div>
          <p className="font-sans text-sm text-muted">
            모든 태그 목록입니다.
          </p>
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
                href={`/tags/${encodeURIComponent(tag.name)}`}
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
