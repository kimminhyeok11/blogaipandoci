"use client";

import { useState, useEffect } from "react";
import { List } from "lucide-react";
import type { TocItem } from "./PostContent";

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
    <aside className="hidden xl:block absolute" style={{ 
      left: 'calc(50% + 400px)', // 본문 중심에서 오른쪽으로
      top: '0',
      width: '240px',
    }}>
      <div className="sticky top-24 bg-paper border border-rule rounded-sm p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full text-left mb-2"
        >
          <List size={16} className="text-muted" />
          <span className="font-sans text-sm font-medium text-ink">목차</span>
          <span className="ml-auto font-sans text-xs text-muted">
            {isOpen ? "−" : "+"}
          </span>
        </button>

        {isOpen && (
          <nav className="space-y-1">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`block font-sans text-sm leading-relaxed transition-colors hover:text-rust ${
                  item.level === 3 ? "pl-3" : ""
                } ${
                  activeId === item.id
                    ? "text-rust font-medium"
                    : "text-muted"
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
