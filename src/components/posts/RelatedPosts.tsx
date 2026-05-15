import Link from "next/link";
import Image from "next/image";
import { Post } from "@/types";

interface RelatedPostsProps {
  posts: Post[];
  currentPostId: string;
}

export function RelatedPosts({ posts, currentPostId }: RelatedPostsProps) {
  // 현재 글 제외하고 최대 6개 표시 (SEO: 더 많은 내부링크)
  const relatedPosts = posts
    .filter((post) => post.id !== currentPostId)
    .slice(0, 6);

  if (relatedPosts.length === 0) return null;

  return (
    <section className="max-w-content mx-auto px-4 sm:px-6 mt-16 pt-12 border-t-2 border-double border-ink/20">
      <h2 className="text-2xl font-serif font-bold text-ink mb-8 text-center">
        <span className="inline-block border-b-2 border-rust pb-2">
          이어서 읽기
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${encodeURIComponent(post.slug)}`}
            className="group block bg-paper border border-ink/10 rounded-lg overflow-hidden hover:border-rust/50 hover:shadow-lg transition-all duration-300"
          >
            {/* 썸네일 */}
            <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-cream">
              {post.cover_image ? (
                <Image
                  src={post.cover_image}
                  alt={post.cover_image_alt || post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">
                  <svg
                    className="w-12 h-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* 텍스트 정보 */}
            <div className="p-5">
              <h3 className="font-serif font-bold text-ink text-base leading-snug line-clamp-2 group-hover:text-rust transition-colors mb-2">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="text-sm text-muted line-clamp-3 font-sans leading-relaxed mb-3">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 text-xs text-muted/80 font-sans border-t border-rule/30 pt-3">
                <span>{post.view_count.toLocaleString()}회 읽음</span>
                <span className="text-rust/70 group-hover:text-rust transition-colors">
                  자세히 보기 →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 더보기 버튼 */}
      <div className="text-center mt-10 mb-8">
        <Link
          href="/posts"
          className="btn-outline"
        >
          전체 글 목록 보기
        </Link>
      </div>
    </section>
  );
}
