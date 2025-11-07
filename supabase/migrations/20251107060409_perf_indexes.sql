-- 인덱스 기반 성능 최적화 (홈/아카이브/인기글 조회 패턴)
-- 안전하게 IF NOT EXISTS 사용

CREATE INDEX IF NOT EXISTS idx_posts_status_created_at
  ON posts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_category_status_created_at
  ON posts (category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_status_view_count
  ON posts (status, view_count DESC);

CREATE INDEX IF NOT EXISTS idx_posts_published_created_at
  ON posts (created_at DESC)
  WHERE status = 'published';