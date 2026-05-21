-- post_revisions 테이블에 메타 정보 및 SEO 필드 추가
-- 목적: revision 복원 시 게시글 전체 상태(메타데이터 포함) 완전 복원

-- 먼저 테이블이 없으면 기본 구조로 생성
CREATE TABLE IF NOT EXISTS post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  revision_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 그 다음 meta 정보 컬럼 추가 (이미 있으면 무시)
ALTER TABLE post_revisions
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS cover_image_alt TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 기존 데이터 호환성 (NULL 허용으로 이미 처리됨)
-- 새 revision부터는 전체 상태 저장 가능

COMMENT ON COLUMN post_revisions.meta_title IS 'SEO 메타 타이틀 (복원 시 사용)';
COMMENT ON COLUMN post_revisions.meta_description IS 'SEO 메타 디스크립션 (복원 시 사용)';
COMMENT ON COLUMN post_revisions.cover_image IS '대표이미지 URL (복원 시 사용)';
COMMENT ON COLUMN post_revisions.cover_image_alt IS '대표이미지 대체텍스트 (복원 시 사용)';
COMMENT ON COLUMN post_revisions.slug IS '글 슬러그 (복원 시 사용)';

-- 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_revisions_post_id 
ON post_revisions(post_id);

CREATE INDEX IF NOT EXISTS idx_revisions_revision_number 
ON post_revisions(post_id, revision_number DESC);

-- race condition 방지를 위한 unique constraint
ALTER TABLE post_revisions
ADD CONSTRAINT IF NOT EXISTS unique_post_revision
UNIQUE (post_id, revision_number);
