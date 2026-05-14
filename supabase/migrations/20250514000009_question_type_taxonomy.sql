-- question_type 고정 enum으로 정규화
-- 기존 free text 값들을 가장 가까운 enum 값으로 매핑

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
    CREATE TYPE public.question_type_enum AS ENUM (
      '상속·유언',
      '전세·임대차',
      '명예훼손·모욕',
      '채무·금전',
      '이혼·가족',
      '형사·고소',
      '계약·거래',
      '기타'
    );
  END IF;
END$$;

-- 기존 데이터 마이그레이션 (free text → 가장 유사한 enum)
UPDATE public.comments
SET question_type = CASE
  WHEN question_type ILIKE '%상속%' OR question_type ILIKE '%유언%' THEN '상속·유언'
  WHEN question_type ILIKE '%전세%' OR question_type ILIKE '%임대%' OR question_type ILIKE '%월세%' THEN '전세·임대차'
  WHEN question_type ILIKE '%명예%' OR question_type ILIKE '%모욕%' THEN '명예훼손·모욕'
  WHEN question_type ILIKE '%채무%' OR question_type ILIKE '%금전%' OR question_type ILIKE '%빌려%' THEN '채무·금전'
  WHEN question_type ILIKE '%이혼%' OR question_type ILIKE '%가족%' OR question_type ILIKE '%양육%' THEN '이혼·가족'
  WHEN question_type ILIKE '%형사%' OR question_type ILIKE '%고소%' OR question_type ILIKE '%고발%' THEN '형사·고소'
  WHEN question_type ILIKE '%계약%' OR question_type ILIKE '%거래%' THEN '계약·거래'
  ELSE '기타'
END
WHERE question_type IS NOT NULL
  AND question_type NOT IN ('상속·유언','전세·임대차','명예훼손·모욕','채무·금전','이혼·가족','형사·고소','계약·거래','기타');
