-- Supabase 쿼리 퍼포먼스 최적화 SQL
-- 인덱스 추가를 통해 쿼리 성능 개선
-- 실행 전 백업 권장

-- 메모리 설정 일시적 증가 (인덱스 생성용)
SET maintenance_work_mem = '256MB';
SET local maintenance_work_mem = '256MB';

-- ============================================================================
-- 1. posts 테이블 인덱스 최적화
-- ============================================================================

-- published + published_at 복합 인덱스 (가장 많이 사용되는 쿼리)
CREATE INDEX IF NOT EXISTS idx_posts_published_published_at 
ON public.posts (published, published_at DESC) 
WHERE published = true;

-- slug 인덱스 (단일 게시글 조회)
CREATE INDEX IF NOT EXISTS idx_posts_slug 
ON public.posts (slug) 
WHERE published = true;

-- view_count 인덱스 (인기 게시글 조회)
CREATE INDEX IF NOT EXISTS idx_posts_view_count 
ON public.posts (view_count DESC) 
WHERE published = true;

-- user_id 인덱스 (사용자별 게시글 조회)
CREATE INDEX IF NOT EXISTS idx_posts_user_id 
ON public.posts (user_id) 
WHERE published = true;

-- ============================================================================
-- 2. post_tags 테이블 인덱스 최적화
-- ============================================================================

-- post_id 인덱스 (게시글별 태그 조회)
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id 
ON public.post_tags (post_id);

-- tag_id 인덱스 (태그별 게시글 조회)
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id 
ON public.post_tags (tag_id);

-- 복합 인덱스 (post_id + tag_id)
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id_tag_id 
ON public.post_tags (post_id, tag_id);

-- ============================================================================
-- 3. comments 테이블 인덱스 최적화
-- ============================================================================

-- post_id 인덱스 (게시글별 댓글 조회)
CREATE INDEX IF NOT EXISTS idx_comments_post_id 
ON public.comments (post_id);

-- user_id 인덱스 (사용자별 댓글 조회)
CREATE INDEX IF NOT EXISTS idx_comments_user_id 
ON public.comments (user_id);

-- status 인덱스 (공개 댓글 조회)
CREATE INDEX IF NOT EXISTS idx_comments_status 
ON public.comments (status) 
WHERE status = 'public';

-- 복합 인덱스 (post_id + status)
CREATE INDEX IF NOT EXISTS idx_comments_post_id_status 
ON public.comments (post_id, status) 
WHERE status = 'public';

-- ============================================================================
-- 4. post_views 테이블 인덱스 최적화
-- ============================================================================

-- post_id 인덱스 (게시글별 조회수)
CREATE INDEX IF NOT EXISTS idx_post_views_post_id 
ON public.post_views (post_id);

-- viewed_at 인덱스 (시간별 조회수)
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at 
ON public.post_views (viewed_at DESC);

-- ============================================================================
-- 5. users 테이블 인덱스 최적화
-- ============================================================================

-- email 인덱스 (이메일 조회)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON public.users (email);

-- role 인덱스 (역할별 조회)
CREATE INDEX IF NOT EXISTS idx_users_role 
ON public.users (role);

-- ============================================================================
-- 6. tags 테이블 인덱스 최적화
-- ============================================================================

-- name 인덱스 (태그 이름 조회)
CREATE INDEX IF NOT EXISTS idx_tags_name 
ON public.tags (name);

-- slug 인덱스 (태그 슬러그 조회)
CREATE INDEX IF NOT EXISTS idx_tags_slug 
ON public.tags (slug);

-- ============================================================================
-- 7. comment_likes 테이블 인덱스 최적화
-- ============================================================================

-- comment_id 인덱스 (댓글별 좋아요)
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id 
ON public.comment_likes (comment_id);

-- user_id 인덱스 (사용자별 좋아요)
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id 
ON public.comment_likes (user_id);

-- 복합 인덱스 (comment_id + user_id) - 중복 방지
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id_user_id 
ON public.comment_likes (comment_id, user_id);

-- ============================================================================
-- 8. comment_reports 테이블 인덱스 최적화
-- ============================================================================

-- comment_id 인덱스 (댓글별 신고)
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id 
ON public.comment_reports (comment_id);

-- reporter_id 인덱스 (신고자별 조회)
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id 
ON public.comment_reports (reporter_id);

-- status 인덱스 (상태별 조회)
CREATE INDEX IF NOT EXISTS idx_comment_reports_status 
ON public.comment_reports (status);

-- ============================================================================
-- 9. images 테이블 인덱스 최적화
-- ============================================================================

-- user_id 인덱스 (사용자별 이미지)
CREATE INDEX IF NOT EXISTS idx_images_user_id 
ON public.images (user_id);

-- ============================================================================
-- 10. GIN 인덱스 (텍스트 검색 최적화)
-- ============================================================================

-- pg_trgm 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- posts 테이블 텍스트 검색 인덱스 (ilike 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_title_gin
ON public.posts USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_excerpt_gin
ON public.posts USING gin (excerpt gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_content_gin
ON public.posts USING gin (content gin_trgm_ops);

-- ============================================================================
-- 11. embedding 컬럼 인덱스 (벡터 검색 최적화)
-- ============================================================================

-- posts 테이블 embedding 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_embedding 
ON public.posts USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- comments 테이블 embedding 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_embedding 
ON public.comments USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 주의: vector 확장이 필요한 경우
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 12. partial 인덱스 (조건부 인덱스)
-- ============================================================================

-- published 게시글만 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_published_only 
ON public.posts (published_at DESC) 
WHERE published = true AND published_at IS NOT NULL;

-- 공개 댓글만 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_public_only 
ON public.comments (created_at DESC) 
WHERE status = 'public';

-- ============================================================================
-- 13. 통계 정보 업데이트
-- ============================================================================

-- 인덱스 생성 후 통계 정보 업데이트
ANALYZE public.posts;
ANALYZE public.post_tags;
ANALYZE public.comments;
ANALYZE public.post_views;
ANALYZE public.users;
ANALYZE public.tags;
ANALYZE public.comment_likes;
ANALYZE public.comment_reports;
ANALYZE public.images;
