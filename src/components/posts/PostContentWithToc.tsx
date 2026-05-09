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
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        <PostContent
          contentMarkdown={contentMarkdown}
          onTocExtract={setTocItems}
        />
      </div>
      <TableOfContents items={tocItems} />
    </div>
  );
}
