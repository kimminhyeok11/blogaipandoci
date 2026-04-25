"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Folder, Loader2 } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

interface Category {
  name: string;
  count: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // category 컬럼이 DB에 없으므로 빈 배열로 설정
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Folder className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">카테고리</h1>
          </div>
          <p className="font-sans text-sm text-muted">
            글들이 카테고리별로 분류되어 있습니다.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-rust" size={32} />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted">
              아직 카테고리가 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/posts?category=${encodeURIComponent(category.name)}`}
                className="group block p-6 bg-cream/30 border border-rule rounded-sm hover:border-rust transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-ink group-hover:text-rust transition-colors">
                    {category.name}
                  </h3>
                  <span className="font-sans text-xs text-muted bg-cream px-2 py-1 rounded">
                    {category.count}개
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-double border-ink text-center py-6 px-4 mt-16">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
