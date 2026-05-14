ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS context_answers jsonb DEFAULT '{}';
