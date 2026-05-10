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

      {/* Utility Navigation */}
      <nav className="mt-3 pt-3 border-t border-rule">
        <ul className="masthead-nav">
          <li className="masthead-nav-item">
            <Link href="/write" className="masthead-nav-link">
              <PenSquare className="inline-block mr-1" size={12} />
              <span>글쓰기</span>
            </Link>
          </li>
          <li className="masthead-nav-item">
            <Link href="/posts" className="masthead-nav-link">
              <span>모든 글</span>
            </Link>
          </li>
          <li className="masthead-nav-item">
            <Link href="/search" className="masthead-nav-link">
              <Search className="inline-block mr-1" size={12} />
              <span>검색</span>
            </Link>
          </li>
          <li className="masthead-nav-item">
            {user ? (
              <Link href="/profile" className="masthead-nav-link">
                <User className="inline-block mr-1" size={12} />
                <span>프로필</span>
              </Link>
            ) : (
              <Link href="/auth" className="masthead-nav-link">
                <User className="inline-block mr-1" size={12} />
                <span>로그인</span>
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
