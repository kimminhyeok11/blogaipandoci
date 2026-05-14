-- pgvector extension 활성화 (Supabase 대시보드에서 수동 활성화 필요할 수 있음)
CREATE EXTENSION IF NOT EXISTS vector;

-- comments 테이블에 embedding 컬럼 추가
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- posts 테이블에 embedding 컬럼 추가
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 유사 사례 검색 RPC 함수 (cosine similarity 기반)
CREATE OR REPLACE FUNCTION public.match_similar_comments(
  query_embedding vector(1536),
  exclude_post_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  question_type text,
  topic_tags text[],
  like_count int,
  reply_count int,
  post_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.content,
    c.question_type,
    c.topic_tags,
    c.like_count,
    c.reply_count,
    c.post_id,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.comments c
  WHERE
    c.status = 'public'
    AND c.post_id != exclude_post_id
    AND c.deleted_at IS NULL
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 인덱스 (성능 최적화)
CREATE INDEX IF NOT EXISTS comments_embedding_idx
  ON public.comments
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
