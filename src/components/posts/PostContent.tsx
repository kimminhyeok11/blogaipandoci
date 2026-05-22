import { processMarkdown, addHeadingIds, extractTocFromHtml, TocItem } from "@/lib/markdown";

interface PostContentProps {
  contentMarkdown: string;
  onTocExtract?: (toc: TocItem[]) => void;
  removeFirstImage?: boolean;
}

export function PostContent({ contentMarkdown, onTocExtract, removeFirstImage = false }: PostContentProps) {
  // 서버에서 마크다운 → HTML 변환
  const contentHtml = processMarkdown(contentMarkdown);
  
  // heading ID 추가
  const processedHtml = addHeadingIds(contentHtml);
  
  // TOC 추출
  const toc = extractTocFromHtml(processedHtml);
  
  // 첫 번째 이미지 제거 (썸네일 중복 방지)
  let finalHtml = processedHtml;
  if (removeFirstImage) {
    finalHtml = processedHtml.replace(/<figure[^>]*>.*?<img[^>]*>.*?<\/figure>/, '');
  }
  
  // TOC 콜백 호출
  if (onTocExtract) {
    onTocExtract(toc);
  }
  
  // 서버 컴포넌트로 직접 HTML 렌더링 (SSR 강화)
  return (
    <div
      className="prose-journal font-serif text-base leading-loose text-[#2a2420]"
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
}
