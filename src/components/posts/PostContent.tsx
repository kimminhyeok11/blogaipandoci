import { processMarkdown, addHeadingIds, extractTocFromHtml, extractImagesFromHtml, TocItem } from "@/lib/markdown";
import { PostContentClient } from "./PostContentClient";

interface PostContentProps {
  contentMarkdown: string;
  onTocExtract?: (toc: TocItem[]) => void;
}

export function PostContent({ contentMarkdown, onTocExtract }: PostContentProps) {
  // 서버에서 마크다운 → HTML 변환
  const contentHtml = processMarkdown(contentMarkdown);
  
  // heading ID 추가
  const processedHtml = addHeadingIds(contentHtml);
  
  // TOC 추출
  const toc = extractTocFromHtml(processedHtml);
  
  // 이미지 추출
  const images = extractImagesFromHtml(processedHtml);
  
  // TOC 콜백 호출
  if (onTocExtract) {
    onTocExtract(toc);
  }
  
  return (
    <PostContentClient
      processedHtml={processedHtml}
      images={images}
    />
  );
}
