"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { processMarkdown } from "@/lib/markdown";

interface PostContentProps {
  contentMarkdown: string;
}

export function PostContent({ contentMarkdown }: PostContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<Array<{ src: string; alt?: string }>>([]);

  // 클라이언트에서 마크다운 → HTML 변환
  const contentHtml = useMemo(() => processMarkdown(contentMarkdown), [contentMarkdown]);

  // HTML에서 이미지 목록 추출
  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, "text/html");
    const imgElements = doc.querySelectorAll("img");
    
    const imgList = Array.from(imgElements).map((img) => ({
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
    })).filter(img => img.src); // 빈 src 제거
    
    setImages(imgList);
  }, [contentHtml]);

  // 이미지 클릭 핸들러
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const imgSrc = target.getAttribute("src");
      if (imgSrc) {
        const index = images.findIndex((img) => img.src === imgSrc);
        if (index >= 0) {
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
      .prose-journal img {
        cursor: zoom-in;
        transition: opacity 0.2s;
      }
      .prose-journal img:hover {
        opacity: 0.9;
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
        dangerouslySetInnerHTML={{ __html: contentHtml }}
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
