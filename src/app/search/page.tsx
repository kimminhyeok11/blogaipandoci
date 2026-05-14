"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { StickyNav } from "@/components/layout/StickyNav";

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
  case_type?: string | null;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlCaseType = searchParams.get("case_type") || "";

  const [query, setQuery] = useState(urlQuery);
  const [activeCaseType, setActiveCaseType] = useState(urlCaseType);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { showToast } = useToast();

  const performSearch = useCallback(async (searchQuery: string, caseType: string) => {
    const hasQuery = searchQuery.trim();
    const hasCaseType = caseType.trim();

    if (!hasQuery && !hasCaseType) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      let q = supabase
        .from("posts")
        .select("id, title, excerpt, slug, published_at, view_count, case_type")
        .eq("published", true)
        .not("published_at", "is", null);

      if (hasCaseType) {
        q = q.eq("case_type", caseType);
      }
      if (hasQuery) {
        q = q.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await q.order("published_at", { ascending: false }).limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch {
      showToast("검색 중 오류 발생", "error");
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, activeCaseType);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeCaseType, performSearch]);

  // URL 파라미터 변경 시 상태 동기화
  useEffect(() => {
    setQuery(urlQuery);
    setActiveCaseType(urlCaseType);
  }, [urlQuery, urlCaseType]);

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
            <Search className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">검색</h1>
            {activeCaseType && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rust text-paper text-xs font-medium rounded-sm">
                {activeCaseType}
                <button
                  type="button"
                  onClick={() => setActiveCaseType("")}
                  className="ml-1 hover:opacity-70"
                  aria-label="필터 제거"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <p className="font-sans text-sm text-muted">
            {activeCaseType ? `'${activeCaseType}' 관련 글을 표시합니다.` : "제목, 내용, 요약에서 검색합니다."}
          </p>
        </div>
        
        <div className="relative mb-8">
          <input
            id="search-query"
            name="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full px-4 py-4 pl-12 bg-white border border-rule rounded-sm focus:outline-none focus:ring-2 focus:ring-rust/20 font-sans"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-rust animate-spin" size={20} />
          )}
        </div>

        {hasSearched && !isSearching && (
          <div className="mb-4">
            <p className="font-sans text-sm text-muted">
              {results.length > 0 ? `${results.length}개의 결과` : "검색 결과가 없습니다"}
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-6">
            {results.map((post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-6 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-sans text-2xs text-rust">글</span>
                    <span className="text-rule">·</span>
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

        {!hasSearched && !query && (
          <div className="text-center py-16">
            <FileText className="mx-auto text-muted mb-4" size={48} />
            <p className="font-sans text-sm text-muted">
              검색어를 입력하세요
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
