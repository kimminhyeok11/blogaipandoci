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

// marked 렌더러 커스터마이징
const renderer = new marked.Renderer();

// 링크 새창에서 열기
renderer.link = ({ href, title, text }) => {
  return `<a href="${href}" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
};

// 이미지 스타일링
renderer.image = ({ href, title, text }) => {
  return `<img src="${href}" alt="${text}" class="my-4 max-w-full h-auto rounded" loading="lazy"${title ? ` title="${title}"` : ''} />`;
};

// 코드 블록 스타일링
renderer.code = ({ text, lang }) => {
  return `<pre class="bg-cream p-4 rounded overflow-x-auto font-mono text-sm my-4"><code${lang ? ` class="language-${lang}"` : ''}>${text}</code></pre>`;
};

// 인라인 코드 스타일링
renderer.codespan = ({ text }) => {
  return `<code class="bg-cream px-1 py-0.5 rounded text-sm font-mono">${text}</code>`;
};

// 인용구 스타일링
renderer.blockquote = ({ text }) => {
  return `<blockquote class="border-l-4 border-rust pl-4 italic text-stone my-4">${text}</blockquote>`;
};

// 구분선 스타일링
renderer.hr = () => {
  return `<hr class="border-t border-rule my-6" />`;
};

// 리스트 스타일링
renderer.list = ({ items, ordered }) => {
  const type = ordered ? 'ol' : 'ul';
  const listClass = ordered
    ? 'list-decimal list-inside my-4 space-y-1 bg-cream/30 rounded-sm p-2 border-l-4 border-rust/30'
    : 'list-disc list-inside my-4 space-y-1 bg-cream/30 rounded-sm p-2 border-l-4 border-rust/30';
  const body = items.map((item: { text: string }) => `<li class="py-1 pl-2 border-b border-rule/30 last:border-0">${item.text}</li>`).join('');
  return `<${type} class="${listClass}">${body}</${type}>`;
};

// 체크리스트 스타일링
renderer.listitem = ({ text, checked, task }) => {
  if (task) {
    const checkbox = checked
      ? '<span class="inline-block w-4 h-4 bg-rust rounded flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>'
      : '<span class="inline-block w-4 h-4 border-2 border-muted rounded flex-shrink-0"></span>';
    const textClass = checked ? 'line-through text-muted' : '';
    return `<li class="py-1 pl-2 border-b border-rule/30 last:border-0 flex items-center gap-2 list-none">${checkbox}<span class="${textClass}">${text}</span></li>`;
  }
  return `<li class="py-1 pl-2 border-b border-rule/30 last:border-0">${text}</li>`;
};

// 테이블 스타일링
renderer.table = ({ header, rows }) => {
  const headerHtml = header.map(cell => `<th class="border border-rule px-3 py-2 bg-cream font-bold text-left">${cell.text}</th>`).join('');
  const bodyHtml = rows.map(row =>
    `<tr>${row.map(cell => `<td class="border border-rule px-3 py-2">${cell.text}</td>`).join('')}</tr>`
  ).join('');
  return `<table class="w-full border-collapse my-4 text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
};

// 헤딩 스타일링
renderer.heading = ({ text, depth }) => {
  const classes: Record<number, string> = {
    1: "text-3xl font-bold mt-8 mb-4",
    2: "text-2xl font-bold mt-6 mb-3",
    3: "text-xl font-bold mt-4 mb-2",
    4: "text-lg font-bold mt-3 mb-2",
    5: "text-base font-bold mt-3 mb-1",
    6: "text-sm font-bold mt-2 mb-1",
  };
  return `<h${depth} class="${classes[depth]}">${text}</h${depth}>`;
};

// 단락 스타일링
renderer.paragraph = ({ text }) => {
  return `<p class="my-4 leading-loose">${text}</p>`;
};

// 볼드 텍스트 렌더링
renderer.strong = ({ text }) => {
  return `<strong class="font-bold text-ink">${text}</strong>`;
};

// 이탤릭 텍스트 렌더링
renderer.em = ({ text }) => {
  return `<em class="italic">${text}</em>`;
};

// 마크다운 처리 함수
function processMarkdown(text: string): string {
  if (!text) return "";
  try {
    return marked.parse(text, { renderer }) as string;
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
