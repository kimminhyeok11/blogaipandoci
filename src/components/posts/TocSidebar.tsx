import { TableOfContents } from "./TableOfContents";
import type { TocItem } from "@/lib/markdown";

interface TocSidebarProps {
  contentMarkdown: string;
}

function parseTocItems(contentMarkdown: string): TocItem[] {
  const headings = contentMarkdown.match(/^#{2,3} .+$/gm) || [];
  return headings.map((heading, index) => {
    const level = heading.match(/^#+/)?.[0].length || 2;
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
}

export function TocSidebar({ contentMarkdown }: TocSidebarProps) {
  const tocItems = parseTocItems(contentMarkdown);

  if (tocItems.length < 3) return null;

  return <TableOfContents items={tocItems} />;
}
