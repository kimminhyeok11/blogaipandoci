"use client";

import Link from "next/link";
import Image from "next/image";
import { Post } from "@/types";

interface RelatedPostsProps {
  posts: Post[];
  currentPostId: string;
}

export function RelatedPosts({ posts, currentPostId }: RelatedPostsProps) {
  // 현재 글 제외하고 최대 4개 표시
  const relatedPosts = posts
    .filter((post) => post.id !== currentPostId)
    .slice(0, 4);

  if (relatedPosts.length === 0) return null;

  return (
    <section className="max-w-content mx-auto px-4 sm:px-6 mt-12 pt-8 border-t-2 border-double border-ink/20">
      <h2 className="text-xl font-serif font-bold text-ink mb-6 text-center">
        <span className="inline-block border-b-2 border-rust pb-1">
          이어서 읽기
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {relatedPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}/`}
            className="group block bg-paper border border-ink/10 rounded-sm overflow-hidden hover:border-rust/30 transition-colors"
          >
            <div className="flex gap-3 p-3">
              {/* 썸네일 */}
              <div className="relative w-20 h-20 flex-shrink-0 rounded-sm overflow-hidden bg-cream">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    alt={post.cover_image_alt || post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <svg
                      className="w-6 h-6"
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
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-bold text-ink text-sm leading-snug line-clamp-2 group-hover:text-rust transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-xs text-muted mt-1 line-clamp-2 font-sans">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted/80 font-sans">
                  <span>{post.view_count.toLocaleString()}회 읽음</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 더보기 버튼 */}
      <div className="text-center mt-6">
        <Link
          href="/posts/"
          className="inline-block px-6 py-2 text-sm font-sans text-rust border border-rust/30 rounded-sm hover:bg-rust/5 transition-colors"
        >
          전체 글 목록 보기 →
        </Link>
      </div>
    </section>
  );
}
