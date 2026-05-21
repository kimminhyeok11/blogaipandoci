-- categories 테이블 생성 및 posts와 연결
-- 목적: case_type 문자열에서 정식 category 시스템으로 마이그레이션

-- 1. categories 테이블 생성
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  post_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 기존 VALID_CASE_TYPES 데이터 삽입
INSERT INTO categories (name, slug, description, seo_title, seo_description, display_order) VALUES
  ('형사', 'criminal', '형사법 관련 모든 절차와 판례', '형사 사건 절차와 법률 정보 | 法 BLOG', '형사 고소, 피고, 합의금, 재판 과정까지 실제 사례 기반 정보', 1),
  ('민사', 'civil', '민사법 관련 분쟁 해결', '민사 소송 및 분쟁 해결 | 法 BLOG', '채무, 계약, 손해배상 등 민사 절차 실무 정보', 2),
  ('이혼·가족', 'family', '이혼과 가족 관련 법률', '이혼 절차와 가족법 | 法 BLOG', '이혼 소송, 양육권, 재산분할, 위자료 실제 사례', 3),
  ('노동', 'labor', '근로자와 사용자 간 분쟁', '노동법과 근로자 권리 | 法 BLOG', '부당해고, 임금체불, 산재보상 노동 분쟁 정보', 4),
  ('부동산', 'real-estate', '부동산 관련 법률', '부동산 법률 및 분쟁 | 法 BLOG', '임대차, 매매, 경매, 분쟁 부동산 법률 정보', 5),
  ('학교폭력', 'school-violence', '학교 내 폭력 사건 처리', '학교폭력 피해 구제 및 절차 | 法 BLOG', '학교폭력 실태조사, 가해 학생 처분, 피해 회복', 6),
  ('지식재산권', 'intellectual-property', '저작권, 특허, 상표권', '지식재산권 보호와 침해 | 法 BLOG', '저작권 침해, 특허 분쟁, 상표권 침해 실사례', 7),
  ('교통사고', 'traffic-accident', '교통사고 관련 형사·민사·보험 법률', '교통사고 법률 자문과 절차 | 法 BLOG', '음주운전, 12대 중과실, 보험사 대응, 합의금, 대인접수 거부 등 실제 사례', 8),
  ('회생·파산', 'bankruptcy', '개인회생·파산 제도 및 절차', '개인회생·파산 법률 자문 | 法 BLOG', '카드빚 해결, 압류 방지, 회생 기간, 파산 불이익, 재기 절차 등 실무 정보', 9)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- 3. posts 테이블에 category_id FK 추가
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 4. 기존 case_type 데이터를 category_id로 마이그레이션
-- case_type(한글) → categories.name 기준 매핑
UPDATE posts p
SET category_id = c.id
FROM categories c
WHERE p.case_type = c.name
  AND p.category_id IS NULL;

-- 4-2. 세부 case_type 매핑 (예: "형사·고소" → "형사")
-- 주의: OR 그룹 전체를 괄호로 감싸야 함 (SQL 우선순위: AND > OR)
UPDATE posts p
SET category_id = c.id
FROM categories c
WHERE (
       (p.case_type LIKE '형사%' AND c.name = '형사')
    OR (p.case_type LIKE '민사%' AND c.name = '민사')
    OR (p.case_type LIKE '이혼%' AND c.name = '이혼·가족')
    OR (p.case_type LIKE '가족%' AND c.name = '이혼·가족')
    OR (p.case_type LIKE '노동%' AND c.name = '노동')
    OR (p.case_type LIKE '부동산%' AND c.name = '부동산')
    OR (p.case_type LIKE '학교%' AND c.name = '학교폭력')
    OR (p.case_type LIKE '폭력%' AND c.name = '학교폭력')
    OR (p.case_type LIKE '지식%' AND c.name = '지식재산권')
    OR (p.case_type LIKE '저작권%' AND c.name = '지식재산권')
    OR (p.case_type LIKE '교통%' AND c.name = '교통사고')
    OR (p.case_type LIKE '사고%' AND c.name = '교통사고')
    OR (p.case_type LIKE '회생%' AND c.name = '회생·파산')
    OR (p.case_type LIKE '파산%' AND c.name = '회생·파산')
)
AND p.category_id IS NULL;

-- 5. categories.post_count 업데이트
UPDATE categories c
SET post_count = (
  SELECT COUNT(*) FROM posts p 
  WHERE p.category_id = c.id 
    AND p.published = true 
    AND p.published_at IS NOT NULL
);

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_post_count ON categories(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id) WHERE published = true;

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

COMMENT ON TABLE categories IS '사이트 핵심 분류 체계 (형사, 민사, 이혼·가족 등)';
COMMENT ON COLUMN categories.post_count IS '해당 카테고리의 발행된 글 수 (denormalized)';
