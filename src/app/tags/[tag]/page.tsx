import Link from "next/link";
import { Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StickyNav } from "@/components/layout/StickyNav";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published_at: string;
  view_count: number;
}

interface TagPageProps {
  params: { tag: string };
}

async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  try {
    // 1. 태그 slug로 tag_id 찾기
    const { data: tagData, error: tagError } = await (supabase
      .from("tags") as any)
      .select("id")
      .eq("slug", tagSlug)
      .single();

    if (tagError || !tagData) {
      return [];
    }

    // 2. post_tags로 해당 태그의 게시글 ID 찾기
    const { data: postTags, error: postTagsError } = await (supabase
      .from("post_tags") as any)
      .select("post_id")
      .eq("tag_id", tagData.id);

    if (postTagsError || !postTags?.length) {
      return [];
    }

    const postIds = postTags.map((pt: any) => pt.post_id);

    // 3. posts 테이블에서 게시글 정보 가져오기
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count")
      .eq("published", true)
      .not("published_at", "is", null)
      .in("id", postIds)
      .order("published_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching posts by tag:", error);
    return [];
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const tag = decodeURIComponent(params.tag);
  const posts = await getPostsByTag(tag);

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/tags" backLabel="모든 태그" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">#{tag}</h1>
          </div>
          <p className="font-sans text-sm text-muted">
            {`총 ${posts.length}개의 글`}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 border border-rule bg-cream rounded-sm">
            <p className="font-sans text-sm text-muted mb-4">
              이 태그의 글이 없습니다.
            </p>
            <Link
              href="/write"
              className="inline-block px-4 py-2 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors"
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
                    <span className="font-sans text-2xs text-rust">#{tag}</span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {new Date(post.published_at).toLocaleDateString("ko-KR")}
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
