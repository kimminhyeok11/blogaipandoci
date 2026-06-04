-- Supabase 성능 최적화 SQL
-- auth_rls_initplan 및 multiple_permissive_policies 해결
-- 실행 전 백업 권장

-- ============================================================================
-- 1. auth_rls_initplan 해결
-- RLS 정책에서 auth.uid()를 (select auth.uid())로 변경하여 성능 최적화
-- ============================================================================

-- public.posts 정책 수정

DROP POLICY IF EXISTS "Authors can view own posts" ON public.posts;
CREATE POLICY "Authors can view own posts" ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
CREATE POLICY "Authors can update own posts" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
CREATE POLICY "Authors can delete own posts" ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own posts" ON public.posts;
CREATE POLICY "Users can view own posts" ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
  );

-- public.tags 정책 수정

DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Authenticated users can create tags" ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- public.post_tags 정책 수정

DROP POLICY IF EXISTS "Authors can manage post_tags for own posts" ON public.post_tags;
CREATE POLICY "Authors can manage post_tags for own posts" ON public.post_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.user_id = (select auth.uid())
    )
  );

-- public.images 정책 수정

DROP POLICY IF EXISTS "Authenticated users can upload images" ON public.images;
CREATE POLICY "Authenticated users can upload images" ON public.images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own images" ON public.images;
CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
  );

-- public.users 정책 수정

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    id = (select auth.uid())
  )
  WITH CHECK (
    id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
  );

-- public.comments 정책 수정

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage all comments" ON public.comments;
CREATE POLICY "Admins can manage all comments" ON public.comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

-- public.comment_likes 정책 수정

DROP POLICY IF EXISTS "Logged in users can like" ON public.comment_likes;
CREATE POLICY "Logged in users can like" ON public.comment_likes
  FOR ALL
  TO authenticated
  USING (
    user_id = (select auth.uid())
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

-- public.comment_reports 정책 수정

DROP POLICY IF EXISTS "Admins can view reports" ON public.comment_reports;
CREATE POLICY "Admins can view reports" ON public.comment_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid())
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 2. multiple_permissive_policies 해결
-- 중복 정책 통합
-- ============================================================================

-- public.comment_likes 정책 통합
-- "Anyone can view likes"와 "Logged in users can like"를 통합

DROP POLICY IF EXISTS "Anyone can view likes" ON public.comment_likes;

CREATE POLICY "Unified comment_likes policy" ON public.comment_likes
  FOR SELECT
  TO public
  USING (true);

-- public.comments 정책 통합
-- "Admins can manage all comments", "Users can create comments", "Anyone can view public comments" 통합

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view public comments" ON public.comments;

CREATE POLICY "Unified comments SELECT policy" ON public.comments
  FOR SELECT
  TO public
  USING (
    status = 'public'
  );

CREATE POLICY "Unified comments INSERT policy" ON public.comments
  FOR INSERT
  TO public
  WITH CHECK (
    -- 로그인한 사용자 또는 익명 사용자
    (auth.role() = 'authenticated' OR auth.role() = 'anon')
    -- 내용 길이 제한
    AND length(content) >= 10
    AND length(content) <= 5000
  );

-- public.post_tags 정책 통합
-- "Anyone can view post_tags"와 "Authors can manage post_tags for own posts" 통합

DROP POLICY IF EXISTS "Anyone can view post_tags" ON public.post_tags;

CREATE POLICY "Unified post_tags policy" ON public.post_tags
  FOR SELECT
  TO public
  USING (true);

-- public.posts 정책 통합
-- "Anyone can view published posts", "Authors can view own posts", "Users can view own posts" 통합

DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;

CREATE POLICY "Unified posts SELECT policy" ON public.posts
  FOR SELECT
  TO public
  USING (
    published = true
    OR user_id = (select auth.uid())
  );

-- public.users 정책 통합
-- "Anyone can view user profiles"와 "Users can view own profile" 통합

DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;

CREATE POLICY "Unified users SELECT policy" ON public.users
  FOR SELECT
  TO public
  USING (
    id = (select auth.uid())
  );
