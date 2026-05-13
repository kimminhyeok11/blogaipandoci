import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Post } from "@/types";
import { StickyNav } from "@/components/layout/StickyNav";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

export const metadata: Metadata = {
  title: "전체 글 목록 | 법률·정책·사회 분석",
  description: "법률, 기술, 비즈니스에 관한 法 BLOG의 모든 게시글을 확인하세요. 실제 판례와 사례를 기반으로 한 심층 분석 콘텐츠를 제공합니다.",
  openGraph: {
    title: "전체 글 목록 | 法 BLOG",
    description: "법률, 기술, 비즈니스에 관한 法 BLOG의 모든 게시글을 확인하세요. 실제 판례와 사례를 기반으로 한 심층 분석 콘텐츠를 제공합니다.",
    type: "website",
    locale: "ko_KR",
    url: "/posts",
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "法 BLOG 전체 글 목록" }],
  },
  alternates: {
    canonical: "/posts",
  },
};

// searchParams 사용으로 동적 렌더링 (ISR 불가)
export const dynamic = "force-dynamic";

// 서버용 Supabase 클라이언트 생성
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error("Supabase 환경변수 누락");
    return null;
  }
  
  return createClient(url, key);
}

async function getPosts(page: number): Promise<{ posts: Post[]; total: number }> {
  const supabase = getServerSupabase();
  if (!supabase) return { posts: [], total: 0 };

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("posts")
    .select("*, user:users(nickname, email)", { count: "exact" })
    .eq("published", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Posts fetch error:", error);
    return { posts: [], total: 0 };
  }

  return { posts: data || [], total: count || 0 };
}

export default async function PostsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const { posts, total } = await getPosts(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-paper">
      {/* Masthead Header */}
      <header className="masthead">
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

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-ink mb-2">모든 글</h1>
          <p className="font-sans text-sm text-muted">
            法 BLOG의 모든 게시글을 확인하세요.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted">
              아직 작성된 글이 없습니다.
            </p>
            <Link
              href="/write"
              className="inline-block mt-4 px-4 py-2 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors"
              rel="nofollow"
            >
              첫 글 작성하기
            </Link>
          </div>
        ) : (
          <>
          <div className="grid gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-6 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-sans text-2xs text-muted">
                      {post.user?.nickname || post.user?.email?.split('@')[0] || "익명"}
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {new Date(post.published_at || post.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {post.view_count.toLocaleString()}회 읽음
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ink mb-2 group-hover:text-rust transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="font-sans text-sm text-muted leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              </article>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-10" aria-label="페이지 탐색">
              {page > 1 && (
                <Link
                  href={`/posts?page=${page - 1}`}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-sans text-muted border border-rule rounded-sm hover:text-rust hover:border-rust/30 transition-colors"
                >
                  <ChevronLeft size={14} />
                  이전
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-muted font-sans text-sm">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={`/posts?page=${p}`}
                      className={`px-3 py-2 text-sm font-sans rounded-sm border transition-colors ${
                        p === page
                          ? "bg-rust text-paper border-rust"
                          : "text-muted border-rule hover:text-rust hover:border-rust/30"
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}
              {page < totalPages && (
                <Link
                  href={`/posts?page=${page + 1}`}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-sans text-muted border border-rule rounded-sm hover:text-rust hover:border-rust/30 transition-colors"
                >
                  다음
                  <ChevronRight size={14} />
                </Link>
              )}
            </nav>
          )}
          </>
        )}
      </main>
    </div>
  );
}
