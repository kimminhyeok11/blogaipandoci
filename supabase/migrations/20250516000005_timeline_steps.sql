-- 사건 진행 타임라인 단계 컬럼 추가
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS timeline_steps text[];
