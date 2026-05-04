-- post_revisions 테이블 생성 (글 히스토리 기능)
-- Supabase Dashboard → SQL Editor에서 실행

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS post_revisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  revision_number integer DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_post_revisions_post_id 
  ON post_revisions(post_id);

CREATE INDEX IF NOT EXISTS idx_post_revisions_created_at 
  ON post_revisions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_revisions_created_by 
  ON post_revisions(created_by);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE post_revisions ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 설정
-- 본인의 리비전만 조회 가능
CREATE POLICY "Users can view own revisions" 
  ON post_revisions FOR SELECT 
  USING (created_by = auth.uid());

-- 본인만 리비전 생성 가능
CREATE POLICY "Users can create own revisions" 
  ON post_revisions FOR INSERT 
  WITH CHECK (created_by = auth.uid());

-- 본인만 리비전 삭제 가능
CREATE POLICY "Users can delete own revisions" 
  ON post_revisions FOR DELETE 
  USING (created_by = auth.uid());

-- 5. 자동 정리 함수 (최신 10개만 유지)
CREATE OR REPLACE FUNCTION cleanup_old_revisions()
RETURNS TRIGGER AS $$
BEGIN
  -- 해당 게시글의 오래된 리비전 삭제 (최신 10개 제외)
  DELETE FROM post_revisions
  WHERE post_id = NEW.post_id
    AND id NOT IN (
      SELECT id FROM post_revisions
      WHERE post_id = NEW.post_id
      ORDER BY created_at DESC
      LIMIT 10
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 설정 (새 리비전 삽입 후 실행)
DROP TRIGGER IF EXISTS trigger_cleanup_old_revisions ON post_revisions;

CREATE TRIGGER trigger_cleanup_old_revisions
  AFTER INSERT ON post_revisions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_revisions();

-- 7. 확인 쿼리
COMMENT ON TABLE post_revisions IS '게시글 히스토리 (최대 10개 자동 관리)';
