import { processMarkdown, addHeadingIds, extractTocFromHtml, TocItem } from "@/lib/markdown";
import { ImageLightboxTrigger } from "./ImageLightboxTrigger";

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

  // 이미지 태그에 data-lightbox 속성 추가 (클라이언트에서 라이트박스 처리)
  finalHtml = finalHtml.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)(?:alt=["']([^"']*)["'])?([^>]*?)>/gi,
    (match, before, src, middle, alt, after) => {
      const altText = alt ? ` alt="${alt}"` : '';
      return `<img${before}src="${src}"${middle}${altText}${after} data-lightbox="true" data-lightbox-src="${src}" data-lightbox-alt="${alt || ''}" style="cursor: zoom-in;">`;
    }
  );

  // TOC 콜백 호출
  if (onTocExtract) {
    onTocExtract(toc);
  }

  // 서버 컴포넌트로 직접 HTML 렌더링 (SEO 최적화) + 클라이언트 라이트박스 트리거
  return (
    <>
      <div
        className="prose-journal font-serif text-base leading-loose text-[#2a2420]"
        dangerouslySetInnerHTML={{ __html: finalHtml }}
      />
      <ImageLightboxTrigger />
    </>
  );
}
