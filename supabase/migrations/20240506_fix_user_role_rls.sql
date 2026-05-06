-- users 테이블 RLS 정책 수정 (익명 사용자도 볼 수 있게)

-- 기존 정책들 정리
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- 1. 모든 인증된 사용자는 본인 정보만 조회
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (id = auth.uid());

-- 2. 익명 사용자(비로그인)는 published된 posts는 볼 수 있어야 하므로 
-- users 테이블도 필요시 조회 가능해야 함
-- 하지만 users 테이블은 개인정보이므로 본인만 보게 유지

-- 3. 본인 정보만 수정 가능
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. 본인 정보만 삽입 가능  
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" 
  ON users FOR INSERT 
  WITH CHECK (id = auth.uid());

-- role 변경은 관리자만 가능하도록 트리거나 별도 로직 필요시 추가
