import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export interface SimilarPost {
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
  posts: SimilarPost[];
}

export async function fetchSimilarPosts(postId: string): Promise<SimilarPost[]> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 원본 글의 메타데이터 조회 (embedding + case_type + current_stage)
    const { data: post } = await admin
      .from("posts")
      .select("id, embedding, case_type, current_stage")
      .eq("id", postId)
      .single();

    if (!post) return [];

    let similarPosts: SimilarPost[] = [];

    // 1. embedding 기반 유사 글 검색 (semantic search)
    if (post.embedding) {
      const { data: similar } = await admin.rpc("match_similar_posts", {
        query_embedding: post.embedding,
        exclude_post_id: postId,
        match_count: 6,
      });
      similarPosts = similar || [];
    }

    // 2. embedding 결과가 부족하면 case_type/current_stage 기반으로 보충
    if (similarPosts.length < 4 && (post.case_type || post.current_stage)) {
      const existingIds = new Set(similarPosts.map((p) => p.id));
      existingIds.add(postId);

      let fallbackQuery = admin
        .from("posts")
        .select(
          "id, title, slug, excerpt, case_type, current_stage, published_at, view_count"
        )
        .eq("published", true)
        .not("published_at", "is", null)
        .order("view_count", { ascending: false })
        .limit(6);

      // case_type이 있으면 같은 유형 우선
      if (post.case_type) {
        fallbackQuery = fallbackQuery.eq("case_type", post.case_type);
      }

      // current_stage가 있으면 같은 단계도 고려 (or 조건으로)
      if (post.current_stage && !post.case_type) {
        fallbackQuery = fallbackQuery.eq("current_stage", post.current_stage);
      }

      const { data: fallbackPosts } = await fallbackQuery;

      if (fallbackPosts) {
        const newPosts = fallbackPosts
          .filter((p) => !existingIds.has(p.id))
          .map(
            (p): SimilarPost => ({
              ...p,
              similarity: 0.5, // fallback은 낮은 similarity
            })
          );

        similarPosts = [...similarPosts, ...newPosts];
      }
    }

    // 3. 여전히 부족하면 같은 case_type의 인기글로 추가 보충
    if (similarPosts.length < 4 && post.case_type) {
      const existingIds = new Set(similarPosts.map((p) => p.id));
      existingIds.add(postId);

      const { data: popularPosts } = await admin
        .from("posts")
        .select(
          "id, title, slug, excerpt, case_type, current_stage, published_at, view_count"
        )
        .eq("published", true)
        .not("published_at", "is", null)
        .eq("case_type", post.case_type)
        .order("view_count", { ascending: false })
        .limit(4);

      if (popularPosts) {
        const newPosts = popularPosts
          .filter((p) => !existingIds.has(p.id))
          .map(
            (p): SimilarPost => ({
              ...p,
              similarity: 0.3,
            })
          );

        similarPosts = [...similarPosts, ...newPosts];
      }
    }

    // 중복 제거 및 최대 4개 반환
    const seen = new Set<string>();
    return similarPosts
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, 4);
  } catch {
    return [];
  }
}

export function SimilarPosts({ posts }: SimilarPostsProps) {

  if (posts.length === 0) return null;

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
