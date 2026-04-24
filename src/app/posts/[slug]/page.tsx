import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";
import { marked } from "marked";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/types";
import { PostActions } from "@/components/posts/PostActions";

// marked 설정
marked.setOptions({
  gfm: true,
  breaks: true,
});

// 마크다운 처리 함수
function processMarkdown(text: string): string {
  if (!text) return "";
  try {
    return marked.parse(text) as string;
  } catch {
    return text;
  }
}

interface PostPageProps {
  params: { slug: string };
}

async function getPost(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, user:users(nickname, avatar_url)")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;
  return data as Post;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.published_at || undefined,
      authors: post.user?.nickname ? [post.user.nickname] : undefined,
      images: post.cover_image
        ? [
            {
              url: post.cover_image,
              alt: post.cover_image_alt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || undefined,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
        <div className="masthead-date">
          {new Date(post.published_at || post.created_at).toLocaleDateString("ko-KR", {
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
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-muted hover:text-rust transition-colors"
                aria-label="공유하기"
              >
                <Share2 size={16} />
              </button>
              <PostActions postId={post.id} slug={post.slug} authorId={post.user_id} />
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="section-label">심층 분석</div>
          <h1 className="headline">{post.title}</h1>
          {post.excerpt && <p className="subheadline">{post.excerpt}</p>}
          <div className="byline">
            <span>{post.user?.nickname || "익명"}</span>
            <span className="byline-sep">|</span>
            <span>
              {new Date(post.published_at || post.created_at).toLocaleDateString("ko-KR")}
            </span>
            <span className="byline-sep">|</span>
            <span>{post.view_count.toLocaleString()} 회 읽음</span>
          </div>
        </section>

        {/* Cover Image */}
        {post.cover_image && (
          <div className="max-w-content mx-auto px-4 sm:px-6 mb-8">
            <img
              src={post.cover_image}
              alt={post.cover_image_alt || post.title}
              className="w-full h-auto max-h-[400px] object-cover rounded-sm"
            />
          </div>
        )}

        {/* Article Content */}
        <article className="article-body">
          <div 
            className="prose-journal font-serif text-base leading-loose text-[#2a2420]"
            dangerouslySetInnerHTML={{ __html: processMarkdown(post.content) }}
          />

          <div className="ornament">— ✦ —</div>

          {/* Share */}
          <div className="flex items-center justify-center gap-4 py-6">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.href : ""
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#1da1f2] text-white font-sans text-xs font-medium rounded-sm hover:opacity-90 transition-opacity"
            >
              𝕏 트윗하기
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.href : ""
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#4267B2] text-white font-sans text-xs font-medium rounded-sm hover:opacity-90 transition-opacity"
            >
              f 공유하기
            </a>
          </div>
        </article>
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
