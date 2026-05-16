-- Add case-related columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS case_type TEXT,
ADD COLUMN IF NOT EXISTS current_stage TEXT,
ADD COLUMN IF NOT EXISTS next_stage TEXT,
ADD COLUMN IF NOT EXISTS estimated_duration TEXT,
ADD COLUMN IF NOT EXISTS involved_agencies TEXT,
ADD COLUMN IF NOT EXISTS common_mistakes TEXT,
ADD COLUMN IF NOT EXISTS expert_level TEXT;

-- Add index for case_type for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_case_type ON public.posts(case_type);
