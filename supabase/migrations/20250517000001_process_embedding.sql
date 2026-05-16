-- 절차 흐름 전용 embedding 컬럼 추가 (current_stage + next_stage + timeline_steps 합산)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS process_embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_posts_process_embedding
  ON public.posts USING ivfflat (process_embedding vector_cosine_ops)
  WITH (lists = 100);
