-- 긴급 RLS 문제 해결

-- 1. users 테이블 RLS 비활성화 (임시)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. posts 테이블 RLS 확인 및 재설정
-- 먼저 기존 정책 확인
-- SELECT * FROM pg_policies WHERE tablename = 'posts';

-- posts RLS 재설정 (익명 사용자도 published 글 보게)
DROP POLICY IF EXISTS "Anyone can view published posts" ON posts;
DROP POLICY IF EXISTS "Authors can view own posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON posts;

-- 새 정책 생성
CREATE POLICY "Anyone can view published posts"
  ON posts FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Authors can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- 3. users 테이블 RLS 다시 활성화 (안전한 정책으로)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- users 테이블 정책 재설정
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- 본인만 조회/수정 가능
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 4. tags, post_tags RLS도 확인
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Anyone can view post_tags" ON post_tags;
CREATE POLICY "Anyone can view post_tags"
  ON post_tags FOR SELECT
  USING (TRUE);
