-- 상황 문장 캐시 테이블
-- 글 발행/수정 시 또는 주기적으로 갱신됨
CREATE TABLE IF NOT EXISTS public.situations_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase text NOT NULL,
  case_type text,
  source_post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_situations_cache_score
  ON public.situations_cache(score DESC);

-- RLS 비활성화 (캐시 테이블은 서비스 롤로만 접근)
ALTER TABLE public.situations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "situations_cache_read_public"
  ON public.situations_cache FOR SELECT
  USING (true);
