-- situations_cache에 situation_slug 컬럼 추가 (허브 페이지 URL용)
ALTER TABLE public.situations_cache
  ADD COLUMN IF NOT EXISTS situation_slug text;

CREATE INDEX IF NOT EXISTS idx_situations_cache_slug
  ON public.situations_cache(situation_slug) WHERE situation_slug IS NOT NULL;
