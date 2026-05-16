"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SimilarPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  case_type: string | null;
  current_stage: string | null;
  published_at: string;
  view_count: number;
  similarity: number;
}

interface SimilarPostsProps {
  postId: string;
}

export function SimilarPosts({ postId }: SimilarPostsProps) {
  const [posts, setPosts] = useState<SimilarPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, limit: 4 }),
    })
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading || posts.length === 0) return null;

  return (
    <section className="max-w-content mx-auto px-4 sm:px-6 py-10 border-t border-rule">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-sans text-xs font-medium tracking-widest uppercase text-muted">
          비슷한 상황의 실제 사례
        </h2>
        <div className="flex-1 h-px bg-rule" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/posts/${p.slug}`}
            className="group p-4 border border-rule rounded-sm hover:border-rust transition-colors"
          >
            {p.case_type && (
              <span className="font-sans text-2xs text-rust font-medium tracking-wide uppercase">
                {p.case_type}
                {p.current_stage && (
                  <span className="text-muted font-normal"> · {p.current_stage}</span>
                )}
              </span>
            )}
            <p className="mt-1 font-bold text-sm text-ink leading-snug group-hover:text-rust transition-colors line-clamp-2">
              {p.title}
            </p>
            {p.excerpt && (
              <p className="mt-1 font-sans text-xs text-muted leading-relaxed line-clamp-2">
                {p.excerpt}
              </p>
            )}
            <p className="mt-2 font-sans text-2xs text-muted/60">
              {p.view_count.toLocaleString()}회 읽음
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
