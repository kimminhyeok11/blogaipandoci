-- 마이그레이션 결과 확인 SQL
-- Supabase SQL Editor에서 실행

-- 1. 변경된 slug 목록 확인 (최근 10개)
SELECT 
    id,
    title,
    slug,
    updated_at,
    created_at
FROM posts
WHERE updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. 잘못된 slug가 남아있는지 확인 (0개여야 정상)
SELECT COUNT(*) as invalid_count
FROM posts
WHERE slug LIKE '-%' 
   OR slug LIKE '%--%' 
   OR LENGTH(slug) < 5
   OR slug = '-';

-- 3. 전체 slug 샘플 확인
SELECT title, slug
FROM posts
WHERE slug NOT LIKE '-%' 
  AND slug NOT LIKE '%--%'
  AND LENGTH(slug) >= 5
ORDER BY created_at DESC
LIMIT 5;
