"use client";

import { useState, useCallback } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";

interface PostContentClientProps {
  processedHtml: string;
  images: Array<{ src: string; alt?: string }>;
}

export function PostContentClient({ processedHtml, images }: PostContentClientProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
