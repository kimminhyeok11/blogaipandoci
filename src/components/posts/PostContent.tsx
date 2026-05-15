"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { processMarkdown } from "@/lib/markdown";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface PostContentProps {
  contentMarkdown: string;
  onTocExtract?: (toc: TocItem[]) => void;
}

function PostContentSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-cream rounded animate-pulse" />
          <div className="h-4 bg-cream rounded animate-pulse w-11/12" />
          <div className="h-4 bg-cream rounded animate-pulse w-10/12" />
        </div>
      ))}
      <div className="h-8 bg-cream rounded animate-pulse w-3/4 mt-8" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-cream rounded animate-pulse" />
          <div className="h-4 bg-cream rounded animate-pulse w-11/12" />
          <div className="h-4 bg-cream rounded animate-pulse w-9/12" />
        </div>
      ))}
    </div>
  );
}

export function PostContent({ contentMarkdown, onTocExtract }: PostContentProps) {
  const [mounted, setMounted] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<Array<{ src: string; alt?: string }>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 클라이언트에서 마크다운 → HTML 변환
  const contentHtml = useMemo(() => processMarkdown(contentMarkdown), [contentMarkdown]);

  // heading ID 포함된 최종 HTML을 useMemo로 고정 (서버/클라이언트 동일 보장)
  const processedHtml = useMemo(() => {
    let counter = 0;
    return contentHtml.replace(/<(h[23])>([\s\S]+?)<\/\1>/g, (match, tag, inner) => {
      const id = `toc-heading-${counter++}`;
      return `<${tag} id="${id}">${inner}</${tag}>`;
    });
  }, [contentHtml]);

  // HTML에서 이미지 목록 및 헤딩(TOC) 추출
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, "text/html");

    // 이미지 추출
    const imgElements = doc.querySelectorAll("img");
    const imgList = Array.from(imgElements).map((img) => ({
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
    })).filter(img => img.src);
    setImages(imgList);

    // TOC 추출 (h2, h3만)
    const headings = doc.querySelectorAll("h2, h3");
    const toc: TocItem[] = Array.from(headings).map((heading) => {
      const text = heading.textContent || "";
      const level = heading.tagName === "H2" ? 2 : 3;
      const id = heading.getAttribute("id") || "";
      return { id, text, level };
    }).filter(item => item.text.trim().length > 0);

    onTocExtract?.(toc);
  }, [processedHtml, onTocExtract, mounted]);

  // 이미지 클릭 핸들러
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      // 링크 안에 있는 이미지는 라이트박스 대신 원래 링크 동작 유지
      const parentLink = target.closest('a');
      if (parentLink) {
        return; // 원래 링크 이동 허용
      }

      const imgSrc = target.getAttribute("src");
      if (imgSrc) {
        const index = images.findIndex((img) => img.src === imgSrc);
        if (index >= 0) {
          e.preventDefault();
          e.stopPropagation();
          setCurrentImageIndex(index);
          setLightboxOpen(true);
        }
      }
    }
  }, [images]);

  if (!mounted) {
    return <PostContentSkeleton />;
  }

  return (
    <>
      <div
        className="prose-journal font-serif text-base leading-loose text-[#2a2420]"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        onClick={handleImageClick}
      />
      <ImageLightbox
        images={images}
        initialIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
