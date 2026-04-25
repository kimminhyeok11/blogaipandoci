"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, PenSquare, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface StickyNavProps {
  backHref?: string;
  backLabel?: string;
  showFullNav?: boolean;
}

export function StickyNav({ backHref = "/", backLabel = "홈으로", showFullNav = false }: StickyNavProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
