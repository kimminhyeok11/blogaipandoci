-- users 테이블에 role 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'moderator'));

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- context_answers 컬럼 추가 (comments 테이블에 없을 경우 대비)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS context_answers jsonb DEFAULT '{}';

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;
