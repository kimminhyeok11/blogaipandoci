"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SITUATIONS = [
  { label: "가족이 빚을 남기고 사망", case_type: "상속·유언" },
  { label: "지급명령 서류를 받음", case_type: "채무·금전" },
  { label: "통장압류 문자 받음", case_type: "채무·금전" },
  { label: "전세금 못 받고 있음", case_type: "전세·임대차" },
  { label: "경찰서 출석요구 받음", case_type: "형사·고소" },
  { label: "이혼 또는 양육권 문제", case_type: "이혼·가족" },
  { label: "계약 분쟁 발생", case_type: "계약·거래" },
];

export function SituationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSituationClick = (case_type: string) => {
    router.push(`/cases/${encodeURIComponent(case_type)}`);
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

        {/* 빠른 상황 선택 버튼 */}
        <div className="flex flex-wrap justify-center gap-2">
          {SITUATIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => handleSituationClick(s.case_type)}
              className="font-sans text-xs text-muted border border-rule/40 rounded-sm px-3 py-1.5 hover:border-rust hover:text-rust transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
