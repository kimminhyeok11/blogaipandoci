import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Post } from "@/types";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "모든 글",
  description: "法 BLOG의 모든 게시글을 확인하세요.",
};

// 동적 렌더링 - 데이터 변경 시 즉시 반영
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

async function getPosts(): Promise<Post[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from("posts")
    .select("*, user:users(nickname)")
    .eq("published", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Posts fetch error:", error);
    return [];
  }

  return data || [];
}

export default async function PostsPage() {
  const posts = await getPosts();

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

      {/* Navigation */}
      <nav className="border-b border-rule bg-paper">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <Link
              href="/"
              className="flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-rust transition-colors"
            >
              <ArrowLeft size={14} />
              홈으로
            </Link>
            <span className="font-sans text-xs text-muted">
              총 {posts.length}개의 글
            </span>
          </div>
        </div>
      </nav>

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
            >
              첫 글 작성하기
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-6 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-sans text-2xs text-muted">
                      {post.user?.nickname || "익명"}
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
        )}
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
