"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-paper">
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      <nav className="border-b border-rule bg-paper">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <Link
              href="/"
              className="flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-rust transition-colors"
            >
              <ArrowLeft size={14} />
              홈으로
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold text-ink mb-8">검색</h1>
        
        <div className="relative mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full px-4 py-3 pl-12 bg-white border border-rule rounded-sm focus:outline-none focus:ring-2 focus:ring-rust/20"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
        </div>

        <p className="text-muted">준비 중입니다.</p>
      </main>
    </div>
  );
}
