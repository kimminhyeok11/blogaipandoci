import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Post } from "@/types";
import { StickyNav } from "@/components/layout/StickyNav";

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

// ISR: 1시간마다 재생성
export const revalidate = 3600;

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
    .select("*, user:users(nickname, email)")
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
        )}
      </main>
    </div>
  );
}
