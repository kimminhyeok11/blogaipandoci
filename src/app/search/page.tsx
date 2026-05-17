import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { StickyNav } from "@/components/layout/StickyNav";
import { SearchInput } from "./SearchInput";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "검색",
  description: "법률, 정책, 사회 이슈 관련 글을 검색합니다.",
  robots: { index: false, follow: true },
};

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
  case_type?: string | null;
}

async function getInitialResults(q: string, caseType: string): Promise<SearchResult[]> {
  if (!q.trim() && !caseType.trim()) return [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, case_type")
      .eq("published", true)
      .not("published_at", "is", null);

    if (caseType.trim()) query = query.eq("case_type", caseType);
    if (q.trim()) {
      // 공백/특수문자로 분리하여 각 키워드 OR 검색
      const keywords = q.trim().split(/[\s\→\,\.]+/).filter(k => k.length > 1);
      if (keywords.length > 0) {
        const conditions = keywords.map(k => 
          `title.ilike.%${k}%,excerpt.ilike.%${k}%,content.ilike.%${k}%`
        );
        query = query.or(conditions.join(','));
      }
    }

    const { data } = await query.order("published_at", { ascending: false }).limit(20);
    return data || [];
  } catch {
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; case_type?: string };
}) {
  const q = searchParams.q || "";
  const caseType = searchParams.case_type || "";
  const initialResults = await getInitialResults(q, caseType);

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
        <Suspense>
          <SearchInput
            initialQuery={q}
            initialCaseType={caseType}
            initialResults={initialResults}
          />
        </Suspense>
      </main>
    </div>
  );
}
