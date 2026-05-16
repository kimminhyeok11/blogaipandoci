-- 글 embedding 기반 유사 포스트 검색 RPC 함수
CREATE OR REPLACE FUNCTION match_similar_posts(
  query_embedding vector(1536),
  exclude_post_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  case_type text,
  current_stage text,
  published_at timestamptz,
  view_count int,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    p.case_type,
    p.current_stage,
    p.published_at,
    p.view_count,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM posts p
  WHERE
    p.id != exclude_post_id
    AND p.published = true
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
