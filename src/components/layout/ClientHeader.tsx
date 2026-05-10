"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PenSquare, User, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export function ClientHeader() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user } = useAuth();

  // 스마트 스티키 헤더 - 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header 
      className={`masthead fixed top-0 left-0 right-0 z-50 bg-paper transition-transform duration-300 ${
        isHeaderVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="masthead-pub">Deep Analysis and Insights</div>
      <Link href="/" className="masthead-title">
        法 BLOG
      </Link>
      <div className="masthead-date" suppressHydrationWarning>
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      {/* Utility Navigation - 아이콘만 최소화 */}
      <nav className="mt-2 pt-2 border-t border-rule">
        <ul className="flex items-center justify-center gap-6">
          <li>
            <Link 
              href="/write" 
              className="p-1 text-ink hover:text-rust transition-colors"
              title="글쓰기"
            >
              <PenSquare size={16} />
            </Link>
          </li>
          <li>
            <Link 
              href="/posts" 
              className="p-1 text-ink hover:text-rust transition-colors"
              title="모든 글"
            >
              <span className="font-sans text-xs font-medium">ALL</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/search" 
              className="p-1 text-ink hover:text-rust transition-colors"
              title="검색"
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
              >
                <User size={16} />
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="p-1 text-ink hover:text-rust transition-colors"
                title="로그인"
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
