"use client";

import { useEffect } from "react";
import { ImageLightbox, useImageLightbox } from "@/components/ImageLightbox";

export function ImageLightboxTrigger() {
  const { isOpen, currentIndex, images, openLightbox, closeLightbox } = useImageLightbox();

  useEffect(() => {
    // data-lightbox 속성이 있는 이미지에 클릭 이벤트 추가
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const img = target.closest('img[data-lightbox="true"]') as HTMLImageElement;

      if (img) {
        const src = img.getAttribute('data-lightbox-src') || img.src;

        // 페이지 내 모든 data-lightbox 이미지 수집
        const allImages = Array.from(document.querySelectorAll('img[data-lightbox="true"]'))
          .map(el => ({
            src: el.getAttribute('data-lightbox-src') || (el as HTMLImageElement).src,
            alt: el.getAttribute('data-lightbox-alt') || (el as HTMLImageElement).alt || '',
          }));

        // 현재 이미지 인덱스 찾기
        const currentIndex = allImages.findIndex(img => img.src === src);

        openLightbox(allImages, currentIndex >= 0 ? currentIndex : 0);
      }
    };

    document.addEventListener('click', handleImageClick);
    return () => document.removeEventListener('click', handleImageClick);
  }, [openLightbox]);

  return (
    <ImageLightbox
      images={images}
      initialIndex={currentIndex}
      isOpen={isOpen}
      onClose={closeLightbox}
    />
  );
}
