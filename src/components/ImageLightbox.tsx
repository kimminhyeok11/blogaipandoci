"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageLightboxProps {
  images: Array<{
    src: string;
    alt?: string;
  }>;
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowLeft") {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (e.key === "ArrowRight") {
      setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }
  }, [images.length, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // initialIndex 변경 시 현재 인덱스 업데이트
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-50"
        aria-label="닫기"
      >
        <X size={32} />
      </button>

      {/* 이전 버튼 */}
      {images.length > 1 && (
        <button
          onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors z-50"
          aria-label="이전 이미지"
        >
          <ChevronLeft size={48} />
        </button>
      )}

      {/* 다음 버튼 */}
      {images.length > 1 && (
        <button
          onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors z-50"
          aria-label="다음 이미지"
        >
          <ChevronRight size={48} />
        </button>
      )}

      {/* 이미지 컨테이너 */}
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img
          src={currentImage.src}
          alt={currentImage.alt || ""}
          className="max-w-full max-h-[85vh] object-contain"
        />
        
        {/* 이미지 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
          <p className="text-white/80 text-sm font-sans">
            {currentImage.alt || ""}
          </p>
          <p className="text-white/60 text-xs font-sans mt-1">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>

      {/* 배경 클릭으로 닫기 */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={onClose}
      />
    </div>
  );
}

// 이미지 클릭 핸들러를 위한 훅
export function useImageLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<Array<{ src: string; alt?: string }>>([]);

  const openLightbox = useCallback((imgs: Array<{ src: string; alt?: string }>, index: number) => {
    setImages(imgs);
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    currentIndex,
    images,
    openLightbox,
    closeLightbox,
  };
}
