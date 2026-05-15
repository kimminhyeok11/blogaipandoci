"use client";

import { useState, useEffect } from "react";
import { List, ChevronDown, ChevronRight } from "lucide-react";
import type { TocItem } from "@/lib/markdown";

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);

  // 현재 보고 있는 헤딩 추적
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0% -60% 0%",
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  // TOC 클릭 시 스무스 스크롤
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // 헤더 높이 고려
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  if (items.length < 3) return null; // 헤딩이 3개 미만이면 TOC 표시 안 함

  return (
    <aside className="w-full">
      <div className="bg-paper border border-rule rounded-lg shadow-sm overflow-hidden">
        {/* 헤더 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-4 py-3 bg-cream/50 hover:bg-cream transition-colors border-b border-rule"
        >
          <div className="flex items-center gap-2">
            <List size={18} className="text-rust" />
            <span className="font-sans text-sm font-semibold text-ink">목차</span>
          </div>
          {isOpen ? (
            <ChevronDown size={16} className="text-muted" />
          ) : (
            <ChevronRight size={16} className="text-muted" />
          )}
        </button>

        {/* 목차 내용 */}
        {isOpen && (
          <nav className="p-4 space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`block font-sans text-sm leading-relaxed transition-all duration-200 rounded-md px-3 py-2 ${
                  item.level === 3 ? "ml-4" : ""
                } ${
                  activeId === item.id
                    ? "bg-rust/10 text-rust font-medium border-l-2 border-rust"
                    : "text-muted hover:text-ink hover:bg-cream/30"
                }`}
              >
                {item.text}
              </a>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
