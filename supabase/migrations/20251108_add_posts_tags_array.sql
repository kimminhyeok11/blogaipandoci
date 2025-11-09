-- Add tags array column to posts and GIN index for fast filtering
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Create GIN index to accelerate contains queries on tags
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON posts USING GIN (tags);