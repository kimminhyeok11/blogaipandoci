import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createClient } from "@supabase/supabase-js";
import type { Post } from "@/types";
import { PostActions } from "@/components/posts/PostActions";
import { ShareButtons } from "@/components/posts/ShareButtons";
import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/StructuredData";
import { StickyNav } from "@/components/layout/StickyNav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app";

// 동적 렌더링 - 데이터 변경 시 즉시 반영
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 서버용 Supabase 클라이언트 생성
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// marked 렌더러 커스터마이징 (v12+ 호환)
const renderer = {
  // 링크 새창에서 열기
  link(token: { href: string; title?: string | null; text: string }) {
    return `<a href="${token.href}" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer"${token.title ? ` title="${token.title}"` : ''}>${token.text}</a>`;
  },

  // 이미지 스타일링
  image(token: { href: string; title?: string | null; text: string }) {
    return `<img src="${token.href}" alt="${token.text}" class="my-4 max-w-full h-auto rounded" loading="lazy"${token.title ? ` title="${token.title}"` : ''} />`;
  },

  // 코드 블록 스타일링
  code(token: { text: string; lang?: string }) {
    return `<pre class="bg-cream p-4 rounded overflow-x-auto font-mono text-sm my-4"><code${token.lang ? ` class="language-${token.lang}"` : ''}>${token.text}</code></pre>`;
  },

  // 인라인 코드 스타일링
  codespan(token: { text: string }) {
    return `<code class="bg-cream px-1 py-0.5 rounded text-sm font-mono">${token.text}</code>`;
  },

  // 인용구 스타일링
  blockquote(token: { text: string }) {
    return `<blockquote class="border-l-4 border-rust pl-4 italic text-stone my-4">${token.text}</blockquote>`;
  },

  // 구분선 스타일링
  hr() {
    return `<hr class="border-t border-rule my-6" />`;
  },

  // 리스트 스타일링
  list(token: { items: { text: string }[]; ordered: boolean }) {
    const type = token.ordered ? 'ol' : 'ul';
    const listClass = token.ordered
      ? 'list-decimal list-inside my-4 space-y-1 bg-cream/30 rounded-sm p-2 border-l-4 border-rust/30'
      : 'list-disc list-inside my-4 space-y-1 bg-cream/30 rounded-sm p-2 border-l-4 border-rust/30';
    const body = token.items.map((item) => `<li class="py-1 pl-2 border-b border-rule/30 last:border-0">${item.text}</li>`).join('');
    return `<${type} class="${listClass}">${body}</${type}>`;
  },

  // 체크리스트 스타일링
  listitem(token: { text: string; checked?: boolean; task?: boolean }) {
    if (token.task) {
      const checkbox = token.checked
        ? '<span class="inline-block w-4 h-4 bg-rust rounded flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>'
        : '<span class="inline-block w-4 h-4 border-2 border-muted rounded flex-shrink-0"></span>';
      const textClass = token.checked ? 'line-through text-muted' : '';
      return `<li class="py-1 pl-2 border-b border-rule/30 last:border-0 flex items-center gap-2 list-none">${checkbox}<span class="${textClass}">${token.text}</span></li>`;
    }
    return `<li class="py-1 pl-2 border-b border-rule/30 last:border-0">${token.text}</li>`;
  },

  // 테이블 스타일링
  table(token: { header: { text: string }[]; rows: { text: string }[][] }) {
    const headerHtml = token.header.map(cell => `<th class="border border-rule px-3 py-2 bg-cream font-bold text-left">${cell.text}</th>`).join('');
    const bodyHtml = token.rows.map(row =>
      `<tr>${row.map(cell => `<td class="border border-rule px-3 py-2">${cell.text}</td>`).join('')}</tr>`
    ).join('');
    return `<table class="w-full border-collapse my-4 text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  },

  // 헤딩 스타일링
  heading(token: { text: string; depth: number }) {
    const classes: Record<number, string> = {
      1: "text-3xl font-bold mt-8 mb-4",
      2: "text-2xl font-bold mt-6 mb-3",
      3: "text-xl font-bold mt-4 mb-2",
      4: "text-lg font-bold mt-3 mb-2",
      5: "text-base font-bold mt-3 mb-1",
      6: "text-sm font-bold mt-2 mb-1",
    };
    return `<h${token.depth} class="${classes[token.depth]}">${token.text}</h${token.depth}>`;
  },

  // 단락 스타일링
  paragraph(token: { text: string }) {
    return `<p class="my-4 leading-loose">${token.text}</p>`;
  },

  // 볼드 텍스트 렌더링
  strong(token: { raw: string; text?: string }) {
    const content = token.text || token.raw || "";
    return `<strong class="font-bold text-ink">${content}</strong>`;
  },

  // 이탤릭 텍스트 렌더링
  em(token: { raw: string; text?: string }) {
    const content = token.text || token.raw || "";
    return `<em class="italic">${content}</em>`;
  },
};

// marked 설정 (v12+ 호환)
marked.use({
  gfm: true,
  breaks: true,
  renderer,
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
  const supabase = getServerSupabase();
  if (!supabase) return null;
  
  // URL 디코딩 (한글/특수문자 처리)
  const decodedSlug = decodeURIComponent(slug);
  console.log("[DEBUG] getPost - original slug:", slug);
  console.log("[DEBUG] getPost - decoded slug:", decodedSlug);
  
  const { data, error } = await supabase
    .from("posts")
    .select("*, user:users(nickname, avatar_url)")
    .eq("slug", decodedSlug)
    .eq("published", true)
    .not("published_at", "is", null)  // 메인페이지와 동일한 조건
    .single();

  if (error) {
    console.error("[DEBUG] getPost error:", error);
    return null;
  }
  
  console.log("[DEBUG] getPost - data found:", !!data);
  return data as Post;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);
  const postUrl = `${SITE_URL}/posts/${params.slug}/`;

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  const description = (post.meta_description || post.excerpt || "").slice(0, 150);

  return {
    title: post.meta_title || post.title,
    description,
    keywords: post.title.split(" ").filter((w: string) => w.length > 1),
    authors: post.user?.nickname ? [{ name: post.user.nickname }] : undefined,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      locale: "ko_KR",
      url: postUrl,
      siteName: "法 BLOG",
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: post.user?.nickname ? [post.user.nickname] : undefined,
      images: post.cover_image
        ? [
            {
              url: post.cover_image,
              width: 1200,
              height: 630,
              alt: post.cover_image_alt || post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  // 본문에서 첫 이미지 추출 (Article Schema용)
  const imgMatch = post.content?.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  const firstImage = post.cover_image || imgMatch?.[1] || undefined;
  const postUrl = `${SITE_URL}/posts/${post.slug}/`;

  return (
    <div className="min-h-screen bg-paper">
      {/* 구조화 데이터 (JSON-LD) */}
      <ArticleSchema
        title={post.title}
        description={post.excerpt || undefined}
        author={post.user?.nickname || "익명"}
        authorId={post.user_id}
        datePublished={post.published_at || post.created_at}
        dateModified={post.updated_at || undefined}
        url={postUrl}
        image={firstImage}
      />
      <BreadcrumbSchema
        items={[
          { name: "홈", url: SITE_URL },
          { name: "글 목록", url: `${SITE_URL}/posts/` },
          { name: post.title, url: postUrl },
        ]}
      />
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

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/" backLabel="홈으로" />
      <div className="flex justify-end max-w-content mx-auto px-4 sm:px-6 py-2">
        <PostActions postId={post.id} slug={post.slug} authorId={post.user_id} />
      </div>

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
          <div className="max-w-content mx-auto px-4 sm:px-6 mb-8 relative aspect-video max-h-[400px]">
            <Image
              src={post.cover_image}
              alt={post.cover_image_alt || post.title}
              fill
              className="object-cover rounded-sm"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
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
          <ShareButtons title={post.title} />
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
