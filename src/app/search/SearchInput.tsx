"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, FileText } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
  case_type?: string | null;
}

interface SearchInputProps {
  initialQuery: string;
  initialCaseType: string;
  initialResults: SearchResult[];
}

export function SearchInput({ initialQuery, initialCaseType, initialResults }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [activeCaseType, setActiveCaseType] = useState(initialCaseType);
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(initialResults.length > 0 || !!initialQuery);

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
      const params = new URLSearchParams();
      if (hasQuery) params.set("q", searchQuery);
      if (hasCaseType) params.set("case_type", caseType);
      router.replace(`/search?${params.toString()}`, { scroll: false });

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.posts || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, activeCaseType);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeCaseType, performSearch]);

  // searchParams 외부 변경 (뒤로가기 등) 동기화
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setActiveCaseType(searchParams.get("case_type") || "");
  }, [searchParams]);

  return (
    <>
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
          autoFocus={!!initialQuery}
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
            <article key={post.id} className="group border-b border-rule pb-6 last:border-0">
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
          <p className="font-sans text-sm text-muted">검색어를 입력하세요</p>
        </div>
      )}
    </>
  );
}
