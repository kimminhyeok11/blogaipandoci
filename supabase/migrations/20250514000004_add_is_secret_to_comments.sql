-- comments 테이블에 is_secret 컬럼 추가 (비밀 질문 기능)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_secret boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_comments_is_secret ON public.comments(is_secret) WHERE is_secret = true;
