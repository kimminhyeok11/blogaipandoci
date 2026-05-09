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
  const [showControls, setShowControls] = useState(true); // 화살표/닫기 버튼 표시 상태

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

  // 화살표/닫기 버튼 자동 숨김 타이머
  useEffect(() => {
    if (!isOpen) return;
    
    // 1초 후 화살표 숨김
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isOpen, currentIndex]); // 이미지 변경 시마다 타이머 리셋

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  // 화면 클릭 시 컨트롤 토글
  const handleContainerClick = () => {
    setShowControls((prev) => !prev);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center overflow-auto"
      style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      onClick={handleContainerClick}
    >
      {/* 닫기 버튼 - 1초 후 숨김, 클릭 시 표시 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-all duration-300 z-50 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="닫기"
      >
        <X size={32} />
      </button>

      {/* 이전 버튼 - 1초 후 숨김 */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          }}
          className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-all duration-300 z-40 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="이전 이미지"
        >
          <ChevronLeft size={48} />
        </button>
      )}

      {/* 다음 버튼 - 1초 후 숨김 */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-all duration-300 z-40 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="다음 이미지"
        >
          <ChevronRight size={48} />
        </button>
      )}

      {/* 이미지 컨테이너 - 브라우저 확대/축소 허용 */}
      <div 
        className="max-w-[90vw] max-h-[80vh] flex flex-col items-center touch-auto"
        style={{ touchAction: 'manipulation' }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.src}
          alt={currentImage.alt || ""}
          className="max-w-full max-h-[70vh] object-contain"
          style={{ touchAction: 'pinch-zoom' }}
          draggable={false}
        />
        
        {/* 이미지 정보 - 이미지 밖으로 이동 */}
        <div className="mt-4 px-4 py-2 text-center max-w-[90vw]">
          <p className="text-white/80 text-sm font-sans leading-relaxed">
            {currentImage.alt || ""}
          </p>
          <p className="text-white/60 text-xs font-sans mt-2">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>

      {/* 안내 메시지 - 컨트롤 숨김 시 표시 */}
      {!showControls && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-xs font-sans animate-pulse">
          화면 클릭으로 메뉴 표시
        </div>
      )}
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
