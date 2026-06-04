-- Supabase 보안 경고 해결 SQL
-- 실행 전 백업 권장
-- 순차적으로 실행하거나 필요한 부분만 선택 실행

-- ============================================================================
-- 1. function_search_path_mutable 해결
-- 함수에 search_path 설정 추가
-- ============================================================================

-- match_similar_comments
CREATE OR REPLACE FUNCTION public.match_similar_comments(
  comment_text text,
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  comment_id uuid,
  post_id uuid,
  similarity_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as comment_id,
    c.post_id,
    (c.embedding <=> (
      SELECT embedding 
      FROM comments 
      WHERE id = (
        SELECT id FROM comments WHERE content = comment_text LIMIT 1
      )
    )) * -1 as similarity_score
  FROM comments c
  WHERE c.embedding IS NOT NULL
  ORDER BY similarity_score DESC
  LIMIT limit_count;
END;
$$;

-- anonymize_comments_on_user_delete
CREATE OR REPLACE FUNCTION public.anonymize_comments_on_user_delete(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE comments
  SET 
    user_id = NULL,
    nickname = '탈퇴한 사용자',
    is_anonymous = true
  WHERE user_id = user_id;
END;
$$;

-- generate_proper_slug
CREATE OR REPLACE FUNCTION public.generate_proper_slug(title text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- 한글, 영문, 숫자, 하이픈만 남기고 공백을 하이픈으로 변환
  base_slug := regexp_replace(
    regexp_replace(
      regexp_replace(lower(title), '[^a-zA-Z0-9가-힣\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  );
  
  -- 앞뒤 하이픈 제거
  base_slug := trim(both '-' from base_slug);
  
  -- 빈 문자열 처리
  IF base_slug = '' THEN
    RETURN 'post-' || extract(epoch from now());
  END IF;
  
  final_slug := base_slug;
  
  -- 슬러그 중복 확인
  WHILE EXISTS (SELECT 1 FROM posts WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- increment_view_count
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- update_categories_updated_at
CREATE OR REPLACE FUNCTION public.update_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- match_similar_posts
CREATE OR REPLACE FUNCTION public.match_similar_posts(
  post_embedding vector(1536),
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  post_id uuid,
  title text,
  slug text,
  similarity_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.title,
    p.slug,
    (p.embedding <=> post_embedding) * -1 as similarity_score
  FROM posts p
  WHERE 
    p.published = true
    AND p.embedding IS NOT NULL
  ORDER BY similarity_score DESC
  LIMIT limit_count;
END;
$$;

-- match_comments_by_post
CREATE OR REPLACE FUNCTION public.match_comments_by_post(
  post_embedding vector(1536),
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  comment_id uuid,
  content text,
  similarity_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as comment_id,
    c.content,
    (c.embedding <=> post_embedding) * -1 as similarity_score
  FROM comments c
  WHERE 
    c.embedding IS NOT NULL
    AND c.status = 'public'
  ORDER BY similarity_score DESC
  LIMIT limit_count;
END;
$$;

-- ============================================================================
-- 2. extension_in_public 해결
-- pg_net 확장을 다른 스키마로 이동 (이미 설치된 경우)
-- ============================================================================

-- 주의: pg_net이 이미 public 스키마에 설치된 경우
-- 새 스키마를 생성하고 이동하는 것이 복잡할 수 있음
-- 대신 현재 상태를 유지하고, 필요한 경우에만 사용하도록 RLS로 제어 권장

-- ============================================================================
-- 3. rls_policy_always_true 해결
-- RLS 정책 조건 수정 (INSERT/UPDATE/DELETE에 대한 제한 추가)
-- ============================================================================

-- comment_history - INSERT 정책 수정
DROP POLICY IF EXISTS "System can insert history" ON public.comment_history;

CREATE POLICY "System can insert history" ON public.comment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 서비스 역할 또는 관리자만 삽입 가능
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- comment_reports - INSERT 정책 수정
DROP POLICY IF EXISTS "Anyone can report" ON public.comment_reports;

CREATE POLICY "Anyone can report" ON public.comment_reports
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- 로그인한 사용자 또는 익명 사용자 신고 허용
    -- 중복 신고 방지는 애플리케이션 레벨에서 처리 권장
    true
  );

-- comments - INSERT 정책 수정
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- 로그인한 사용자 또는 익명 사용자 댓글 작성 허용
    -- 하지만 스팸 방지를 위해 추가 제한 필요
    length(content) >= 10
    AND length(content) <= 5000
  );

-- post_views - ALL 정책 수정
DROP POLICY IF EXISTS "Service role can manage post_views" ON public.post_views;

CREATE POLICY "Service role can manage post_views" ON public.post_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. public_bucket_allows_listing 해결
-- storage 정책 제한
-- ============================================================================

-- images bucket SELECT 정책 수정
-- 주의: 이 정책은 storage.objects 테이블에 적용
-- Supabase 대시보드에서 Storage > images > Policies에서 직접 수정 권장

-- 현재 정책 삭제
-- DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;

-- 새 정책 생성 (파일 목록 조회 제한, 개별 파일 접근만 허용)
-- CREATE POLICY "Individual file access only" ON storage.objects
--   FOR SELECT
--   TO public
--   USING (
--     bucket_id = 'images'
--     AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
--   );

-- ============================================================================
-- 5. anon_security_definer_function_executable 해결
-- 인증 없이 SECURITY DEFINER 함수 실행 제한
-- ============================================================================

-- anonymize_comments_on_user_delete - anon 권한 제거
REVOKE EXECUTE ON FUNCTION public.anonymize_comments_on_user_delete(uuid) FROM anon;

-- handle_new_user - anon 권한 제거
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- rls_auto_enable - anon 권한 제거
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;

-- ============================================================================
-- 6. authenticated_security_definer_function_executable 해결
-- 인증된 사용자 SECURITY DEFINER 함수 실행 제한
-- ============================================================================

-- anonymize_comments_on_user_delete - authenticated 권한 제거
REVOKE EXECUTE ON FUNCTION public.anonymize_comments_on_user_delete(uuid) FROM authenticated;

-- handle_new_user - authenticated 권한 제거
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- rls_auto_enable - authenticated 권한 제거
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- ============================================================================
-- 7. auth_leaked_password_protection 해결
-- Auth 설정에서 활성화 (SQL로 해결 불가)
-- ============================================================================
-- 사용자가 직접 Supabase 대시보드 > Authentication > Policies에서 활성화 필요
