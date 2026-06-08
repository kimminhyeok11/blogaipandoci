"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PenSquare, User, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function ClientHeader() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { user } = useAuth();

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  }, []);

  // 스마트 스티키 헤더 - 스크롤 감지
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <header 
      className={`masthead fixed top-0 left-0 right-0 z-50 bg-paper transition-transform duration-300 ${
        isHeaderVisible ? "translate-y-0" : "-translate-y-full"
      }`}
      role="banner"
    >
      <div className="masthead-pub">Deep Analysis and Insights</div>
      <Link href="/" className="masthead-title" aria-label="홈으로 이동">
        法 BLOG
      </Link>
      <div className="masthead-date" suppressHydrationWarning aria-live="polite">
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      {/* Utility Navigation - 아이콘만 최소화 */}
      <nav className="mt-1 pt-1 border-t border-rule" aria-label="사이트 네비게이션">
        <ul className="flex items-center justify-center gap-6">
          {user?.role === "admin" && (
            <li>
              <Link 
                href="/write" 
                className="p-1 text-ink hover:text-rust transition-colors"
                title="글쓰기"
                rel="nofollow"
                aria-label="새 글 작성"
              >
                <PenSquare size={16} />
              </Link>
            </li>
          )}
          <li>
            <Link 
              href="/posts" 
              className="p-1 text-ink hover:text-rust transition-colors"
              title="모든 글"
              aria-label="모든 글 보기"
            >
              <span className="font-sans text-xs font-medium">ALL</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/cases" 
              className="p-1 text-ink hover:text-rust transition-colors"
              title="사건 유형별 안내"
              aria-label="사건 유형별 안내 보기"
            >
              <span className="font-sans text-xs font-medium">사건유형</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/search" 
              className="p-1 text-ink hover:text-rust transition-colors"
              title="검색"
              rel="nofollow"
              aria-label="검색 페이지로 이동"
            >
              <Search size={16} />
            </Link>
          </li>
          <li>
            {user ? (
              <Link 
                href="/profile" 
                className="p-1 text-ink hover:text-rust transition-colors"
                title="프로필"
                rel="nofollow"
                aria-label="프로필 페이지로 이동"
              >
                <User size={16} />
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="p-1 text-ink hover:text-rust transition-colors"
                title="로그인"
                rel="nofollow"
                aria-label="로그인 페이지로 이동"
              >
                <User size={16} />
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
