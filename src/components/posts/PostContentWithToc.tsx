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
    <div className="flex gap-8 justify-center items-start">
      {/* 본문 - 고정 너비 */}
      <div className="max-w-3xl flex-1">
        <PostContent
          contentMarkdown={contentMarkdown}
          onTocExtract={setTocItems}
        />
      </div>
      
      {/* TOC 컨테이너 - 스크롤 시 따라다님 (xl 이상 화면) */}
      <div className="hidden xl:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <TableOfContents items={tocItems} />
        </div>
      </div>
    </div>
  );
}
