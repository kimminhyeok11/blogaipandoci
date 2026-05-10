-- Supabase SQL Editor에서 실행
-- slug 마이그레이션 (한 번에 처리)

-- 함수 생성 (없으면 생성)
CREATE OR REPLACE FUNCTION generate_proper_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(title, '[^\uAC00-\uD7AF\w\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        ),
        '^-|-$', '', 'g'
    );
    
    -- 빈 값 체크
    IF length(result) < 2 THEN
        result := regexp_replace(
            regexp_replace(
                regexp_replace(title, '[^\w\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        );
    END IF;
    
    IF length(result) < 2 THEN
        result := 'post-' || substr(md5(title || now()::text), 1, 8);
    END IF;
    
    RETURN left(result, 200);
END;
$$ LANGUAGE plpgsql;

-- 잘못된 slug 목록 확인
SELECT count(*) as invalid_count 
FROM posts 
WHERE slug LIKE '-%' 
   OR slug LIKE '%--%' 
   OR slug LIKE '%-%'
   OR length(slug) < 5
   OR slug = '-';

-- 마이그레이션 실행 (하나씩 처리 - 중복 방지)
DO $$
DECLARE
    r RECORD;
    new_slug TEXT;
    counter INT := 0;
BEGIN
    FOR r IN 
        SELECT id, title, slug 
        FROM posts 
        WHERE slug LIKE '-%' 
           OR slug LIKE '%--%' 
           OR length(slug) < 5 
           OR slug = '-'
        ORDER BY created_at DESC
    LOOP
        new_slug := generate_proper_slug(r.title);
        
        -- 중복 체크
        IF EXISTS (SELECT 1 FROM posts WHERE slug = new_slug AND id != r.id) THEN
            new_slug := new_slug || '-' || substr(md5(r.id::text), 1, 6);
        END IF;
        
        UPDATE posts 
        SET slug = new_slug, 
            updated_at = now() 
        WHERE id = r.id;
        
        counter := counter + 1;
        RAISE NOTICE 'Updated: % -> %', r.slug, new_slug;
    END LOOP;
    
    RAISE NOTICE '총 %개 수정 완료', counter;
END $$;

-- 결과 확인
SELECT count(*) as remaining_invalid
FROM posts 
WHERE slug LIKE '-%' 
   OR slug LIKE '%--%' 
   OR length(slug) < 5 
   OR slug = '-';
