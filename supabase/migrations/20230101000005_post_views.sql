-- 조회 로그 테이블 (일별 조회수 추적)
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_hash TEXT  -- IP 해시 (프라이버시 보호, 중복 방지 참고용)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON public.post_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_daily ON public.post_views(post_id, viewed_at);

-- RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- service_role만 insert 가능 (API에서만 기록)
CREATE POLICY "Service role can manage post_views"
  ON public.post_views FOR ALL
  USING (true)
  WITH CHECK (true);

-- 권한
GRANT ALL ON public.post_views TO service_role;
GRANT SELECT ON public.post_views TO authenticated;
