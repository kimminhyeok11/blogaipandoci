"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { SituationItem } from "@/lib/situations";

interface SituationSearchProps {
  situations: SituationItem[];
}

export function SituationSearch({ situations }: SituationSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSituationClick = (item: SituationItem) => {
    if (item.target_url) {
      router.push(item.target_url);
    } else if (item.case_type) {
      router.push(`/cases/${encodeURIComponent(item.case_type)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(item.phrase)}`);
    }
  };

  return (
    <section className="border-b border-rule py-10 px-4 sm:px-6">
      <div className="max-w-content mx-auto">
        <p className="font-sans text-xs font-medium tracking-widest uppercase text-muted mb-4 text-center">
          무슨 일이 있었나요?
        </p>

        {/* 상황 검색 입력 */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-5 max-w-lg mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 통장압류 문자 왔는데, 엄마 빚이 넘어오나요..."
            className="flex-1 font-sans text-sm text-ink placeholder:text-muted/40 bg-paper border border-rule/40 rounded-sm px-3 py-2 focus:border-rust focus:outline-none"
          />
          <button
            type="submit"
            className="p-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors shrink-0"
            aria-label="검색"
          >
            <Search size={16} />
          </button>
        </form>

        {/* 지금 많이 찾는 상황 버튼 (DB 기반) */}
        <div className="flex flex-wrap justify-center gap-2">
          {situations.map((s) => (
            <button
              key={s.phrase}
              type="button"
              onClick={() => handleSituationClick(s)}
              className="font-sans text-xs text-muted border border-rule/40 rounded-sm px-3 py-1.5 hover:border-rust hover:text-rust transition-colors"
            >
              {s.phrase}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
