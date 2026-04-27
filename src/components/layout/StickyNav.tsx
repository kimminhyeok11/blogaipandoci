"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, PenSquare, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface StickyNavProps {
  backHref?: string;
  backLabel?: string;
  showFullNav?: boolean;
}

// throttle 유틸리티
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

export function StickyNav({ backHref = "/", backLabel = "홈으로", showFullNav = false }: StickyNavProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const { user } = useAuth();

  const updateVisibility = useCallback(() => {
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const prevScrollY = lastScrollY.current;

    // 아래로 스크롤 & 50px 초과 시 숨김 (모바일에서는 더 빨리 반응)
    if (currentScrollY > prevScrollY && currentScrollY > 50) {
      setIsVisible(false);
    } else {
      // 위로 스크롤 or 최상단 시 표시
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  const handleScroll = useCallback(
    throttle(() => {
      if (!ticking.current) {
        requestAnimationFrame(updateVisibility);
        ticking.current = true;
      }
    }, 100),
    [updateVisibility]
  );

  useEffect(() => {
    // 초기값 설정
    lastScrollY.current = window.scrollY || document.documentElement.scrollTop || 0;

    // scroll 이벤트
    window.addEventListener("scroll", handleScroll, { passive: true });
    // touchmove 이벤트 (모바일 인앱 대응)
    window.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, [handleScroll]);

  return (
    <nav
      className={`border-b border-rule bg-paper sticky top-0 z-40 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-6">
            {showFullNav ? (
              <>
                <Link href="/" className="font-sans text-xs font-medium text-ink hover:text-rust transition-colors">
                  홈
                </Link>
                <Link href="/posts" className="font-sans text-xs font-medium text-muted hover:text-rust transition-colors">
                  모든 글
                </Link>
                <Link href="/tags" className="font-sans text-xs font-medium text-muted hover:text-rust transition-colors">
                  태그
                </Link>
              </>
            ) : (
              <Link
                href={backHref}
                className="flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-rust transition-colors"
              >
                <ArrowLeft size={14} />
                {backLabel}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="p-2 text-muted hover:text-rust transition-colors"
              aria-label="검색"
            >
              <Search size={18} />
            </Link>
            <Link
              href="/write"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              <PenSquare size={14} />
              <span className="hidden sm:inline">글쓰기</span>
            </Link>
            <Link
              href={user ? "/profile" : "/login"}
              className="p-2 text-muted hover:text-rust transition-colors"
              aria-label={user ? "마이페이지" : "로그인"}
            >
              <User size={18} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
