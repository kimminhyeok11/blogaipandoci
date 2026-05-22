"use client";
/* eslint-disable @next/next/no-img-element */
// CSS transform(scale/translate) + draggable 제어가 필요한 lightbox - next/image 대체 불가

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

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
  
  // 줌 상태
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
    // 이미지 변경 시 줌 리셋
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [initialIndex]);

  // 줌 인
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.3, 5));
  }, []);

  // 줌 아웃
  const zoomOut = useCallback(() => {
    setScale(prev => {
      const newScale = Math.max(prev / 1.3, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 }); // 원래 크기로 돌아가면 위치도 리셋
      }
      return newScale;
    });
  }, []);

  // 줌 리셋
  const zoomReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 마우스 휠 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, [zoomIn, zoomOut]);

  // 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  }, [scale, position]);

  // 드래그 이동
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  }, [isDragging, scale]);

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

      {/* 줌 컨트롤 버튼 */}
      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 transition-all duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="축소"
        >
          <ZoomOut size={20} />
        </button>
        <span className="text-white text-sm font-sans px-2 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="확대"
        >
          <ZoomIn size={20} />
        </button>
        {scale !== 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); zoomReset(); }}
            className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            aria-label="원래 크기"
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* 이미지 컨테이너 - 줌/드래그 지원 */}
      <div 
        ref={containerRef}
        className="max-w-[90vw] max-h-[80vh] flex flex-col items-center overflow-hidden cursor-move"
        style={{ 
          touchAction: 'none',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {currentImage && (
          <>
            <img
              src={currentImage.src}
              alt={currentImage.alt || ""}
              className="max-w-full max-h-[70vh] object-contain transition-transform duration-200"
              style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center'
              }}
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
          </>
        )}
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
