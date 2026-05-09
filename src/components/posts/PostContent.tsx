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

export function PostContent({ contentMarkdown, onTocExtract }: PostContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<Array<{ src: string; alt?: string }>>([]);

  // 클라이언트에서 마크다운 → HTML 변환
  const contentHtml = useMemo(() => processMarkdown(contentMarkdown), [contentMarkdown]);

  // HTML에서 이미지 목록 및 헤딩(TOC) 추출
  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, "text/html");
    
    // 이미지 추출
    const imgElements = doc.querySelectorAll("img");
    const imgList = Array.from(imgElements).map((img) => ({
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
    })).filter(img => img.src);
    setImages(imgList);
    
    // TOC 추출 (h2, h3만)
    const headings = doc.querySelectorAll("h2, h3");
    const toc: TocItem[] = Array.from(headings).map((heading, index) => {
      const text = heading.textContent || "";
      const level = heading.tagName === "H2" ? 2 : 3;
      const id = `heading-${index}`;
      return { id, text, level };
    }).filter(item => item.text.trim().length > 0);
    
    onTocExtract?.(toc);
  }, [contentHtml, onTocExtract]);

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

  // 이미지 클릭 가능하도록 CSS 클래스 추가
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .prose-journal img:not(a img) {
        cursor: zoom-in;
        transition: opacity 0.2s;
      }
      .prose-journal img:not(a img):hover {
        opacity: 0.9;
      }
      /* 링크 안 이미지는 기본 커서 */
      .prose-journal a img {
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <div
        className="prose-journal font-serif text-base leading-loose text-[#2a2420]"
        dangerouslySetInnerHTML={{ __html: contentHtml.replace(/<(h[23])>([^<]+)<\/\1>/g, (match, tag, text, index) => {
          const id = `heading-${Math.floor(index / 2)}`;
          return `<${tag} id="${id}">${text}</${tag}>`;
        }) }}
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
