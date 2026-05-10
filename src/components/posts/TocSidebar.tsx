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
    // 마크다운에서 헤딩 추출
    const headings = contentMarkdown.match(/^#{2,3} .+$/gm) || [];
    // PostContent와 동일한 ID 생성 방식 사용
    const items: TocItem[] = headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 2;
      const text = heading.replace(/^#+ /, "");
      const id = `toc-heading-${index}`; // PostContent와 동일!
      return { id, text, level };
    });
    setTocItems(items);
  }, [contentMarkdown]);

  if (tocItems.length < 3) return null;

  return <TableOfContents items={tocItems} />;
}
