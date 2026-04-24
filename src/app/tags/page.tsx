"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TagData {
  name: string;
  count: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data: posts, error } = await supabase
          .from("posts")
          .select("tags")
          .eq("published", true)
          .neq("published_at", null);

        if (error) throw error;

        // 태그 파싱 및 집계
        const tagMap = new Map<string, number>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        posts?.forEach((post: any) => {
          if (post.tags) {
            // 쉼표로 구분된 태그 파싱
            const tagList = post.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
            tagList.forEach((tag: string) => {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
          }
        });

        const sortedTags = Array.from(tagMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setTags(sortedTags);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

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
          </div>
        </div>
      </nav>

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">태그</h1>
          </div>
          <p className="font-sans text-sm text-muted">
            모든 태그 목록입니다.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-rust" size={32} />
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted">
              아직 태그가 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                href={`/tags/${encodeURIComponent(tag.name)}`}
                className="group flex items-center gap-2 px-4 py-2 bg-cream/30 border border-rule rounded-full hover:border-rust hover:bg-rust/5 transition-all"
              >
                <span className="text-rust">#</span>
                <span className="font-sans text-sm text-ink group-hover:text-rust transition-colors">
                  {tag.name}
                </span>
                <span className="font-sans text-xs text-muted bg-cream px-1.5 py-0.5 rounded">
                  {tag.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t-3 border-double border-ink text-center py-6 px-4 mt-16">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
