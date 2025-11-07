-- Optimize sitemap query: status='published' ORDER BY updated_at DESC
-- Adds composite index to cover filtering and ordering by updated_at
CREATE INDEX IF NOT EXISTS idx_posts_status_updated_at
ON public.posts (status, updated_at DESC);