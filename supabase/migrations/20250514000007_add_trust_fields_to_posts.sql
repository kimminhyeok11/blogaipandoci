-- 신뢰 배지용 컬럼 추가
-- is_ai_assisted: AI 보조 작성 여부 표시
-- reviewed_at: 마지막 검토일 표시

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_ai_assisted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz DEFAULT NULL;
