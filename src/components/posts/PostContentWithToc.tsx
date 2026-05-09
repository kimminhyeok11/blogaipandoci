"use client";

import { useState } from "react";
import { PostContent, TocItem } from "./PostContent";
import { TableOfContents } from "./TableOfContents";

interface PostContentWithTocProps {
  contentMarkdown: string;
}

export function PostContentWithToc({ contentMarkdown }: PostContentWithTocProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  return (
    <div className="relative">
      {/* 본문 - 중앙 고정 너비 */}
      <div className="max-w-3xl mx-auto">
        <PostContent
          contentMarkdown={contentMarkdown}
          onTocExtract={setTocItems}
        />
      </div>
      
      {/* TOC - 본문 밖 좌우 여백 활용 (xl 이상 화면) */}
      <TableOfContents items={tocItems} />
    </div>
  );
}
