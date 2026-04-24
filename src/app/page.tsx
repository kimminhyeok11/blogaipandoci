"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PenSquare, User, Search } from "lucide-react";
import { AdSense } from "@/components/ads/AdSense";
import { supabase } from "@/lib/supabase";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  published_at: string;
  view_count: number;
  user?: { nickname: string };
}

export default function HomePage() {
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // 스마트 스티키 헤더 - 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 스크롤 다운 시 헤더 숨김 (100px 이상 스크롤했을 때)
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else {
        // 스크롤 업 시 헤더 표시
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Supabase에서 인기글 및 최신글 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // 인기글 (조회수 기준) - 히어로에 표시
        const { data: popularPosts, error: popularError } = await supabase
          .from("posts")
          .select("id, title, excerpt, slug, category, published_at, view_count, user_id")
          .eq("published", true)
          .order("view_count", { ascending: false })
          .limit(1);

        if (popularError) {
          console.error("Popular posts error:", popularError);
        }

        if (popularPosts && popularPosts.length > 0) {
          setFeaturedPost(popularPosts[0]);
        }

        // 최신글 (날짜 기준)
        const { data: latestPosts, error: latestError } = await supabase
          .from("posts")
          .select("id, title, excerpt, slug, category, published_at, view_count, user_id")
          .eq("published", true)
          .order("published_at", { ascending: false })
          .limit(5);

        if (latestError) {
          console.error("Latest posts error:", latestError);
        }

        if (latestPosts) {
          setRecentPosts(latestPosts);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      {/* Masthead Header - Smart Sticky */}
      <header 
        className={`masthead fixed top-0 left-0 right-0 z-50 bg-paper transition-transform duration-300 ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
        <div className="masthead-date">
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[120px]" />

      {/* Navigation */}
      <nav className="border-b border-rule bg-paper sticky top-0 z-40">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-sans text-xs font-medium text-ink hover:text-rust transition-colors">
                홈
              </Link>
              <Link href="/posts" className="font-sans text-xs font-medium text-muted hover:text-rust transition-colors">
                모든 글
              </Link>
              <Link href="/tags" className="font-sans text-xs font-medium text-muted hover:text-rust transition-colors">
                태그
              </Link>
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
                href="/login"
                className="p-2 text-muted hover:text-rust transition-colors"
                aria-label="로그인"
              >
                <User size={18} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero / Featured Post - Dynamic from Supabase */}
        {isLoading ? (
          <section className="hero">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-cream rounded w-24 mx-auto" />
              <div className="h-12 bg-cream rounded w-3/4 mx-auto" />
              <div className="h-6 bg-cream rounded w-1/2 mx-auto" />
            </div>
          </section>
        ) : featuredPost ? (
          <section className="hero">
            <div className="section-label">{featuredPost.category || "심층 분석"}</div>
            <h1 className="headline">
              {featuredPost.title.split(",")[0] || featuredPost.title},
              <br />
              <em>{featuredPost.title.split(",")[1]?.trim() || "인기 글"}</em>
            </h1>
            <p className="subheadline">{featuredPost.excerpt}</p>
            <div className="byline">
              <span>{featuredPost.user?.nickname || "익명"}</span>
              <span className="byline-sep">|</span>
              <span>{new Date(featuredPost.published_at).toLocaleDateString("ko-KR")}</span>
              <span className="byline-sep">|</span>
              <span>{featuredPost.view_count.toLocaleString()} 회 읽음</span>
            </div>
            <Link
              href={`/posts/${featuredPost.slug}`}
              className="inline-block mt-6 px-6 py-2 border-2 border-ink text-ink font-sans text-xs font-medium tracking-wider uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              자세히 읽기
            </Link>
          </section>
        ) : (
          <section className="hero">
            <div className="section-label">블로그</div>
            <h1 className="headline">
              法 BLOG,
              <br />
              <em>깊이 있는 분석</em>
            </h1>
            <p className="subheadline">아직 발행된 글이 없습니다.</p>
          </section>
        )}

        {/* Recent Posts */}
        <section className="max-w-content mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-sans text-xs font-medium tracking-widest uppercase text-muted">
              최신 글
            </h2>
            <div className="flex-1 h-px bg-rule"></div>
          </div>

          <div className="grid gap-8">
            {recentPosts.map((post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-8 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-2xs tracking-wider uppercase text-rust">
                      {post.category}
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {new Date(post.published_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-2 group-hover:text-rust transition-colors">
                    {post.title}
                  </h3>
                  <p className="font-sans text-sm text-muted leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>

          {/* 광고 */}
          <div className="my-12">
            <AdSense
              slot="7498833217"
              style={{ minHeight: "250px" }}
              format="auto"
            />
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 px-6 py-3 border border-ink text-ink font-sans text-xs font-medium tracking-wider uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              모든 글 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-double border-ink text-center py-6 px-4">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
