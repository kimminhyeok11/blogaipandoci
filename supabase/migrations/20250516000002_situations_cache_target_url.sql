-- situations_cache에 target_url 컬럼 추가
-- 버튼 클릭 시 /search?q= 대신 실제 글로 직접 이동
ALTER TABLE public.situations_cache
  ADD COLUMN IF NOT EXISTS target_url text;
