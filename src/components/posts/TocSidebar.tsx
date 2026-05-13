"use client";

import { useState, useEffect } from "react";
import { TableOfContents } from "./TableOfContents";
import type { TocItem } from "./PostContent";

interface TocSidebarProps {
  contentMarkdown: string;
}

export function TocSidebar({ contentMarkdown }: TocSidebarProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  useEffect(() => {
    // 마크다운에서 h2/h3 헤딩 추출 (PostContent의 처리와 동기화)
    const headings = contentMarkdown.match(/^#{2,3} .+$/gm) || [];
    const items: TocItem[] = headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 2;
      // 인라인 마크업 제거: **굵게**, _이탤릭_, `코드`, ~~취소선~~
      const text = heading
        .replace(/^#+ /, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/~~(.+?)~~/g, "$1");
      const id = `toc-heading-${index}`;
      return { id, text, level };
    });
    setTocItems(items);
  }, [contentMarkdown]);

  if (tocItems.length < 3) return null;

  return <TableOfContents items={tocItems} />;
}
