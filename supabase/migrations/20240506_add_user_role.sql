-- users 테이블에 role 컬럼 추가 (관리자 권한)

-- 1. role 컬럼 추가 (기본값 'user')
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. 기존 데이터에 기본값 적용
UPDATE users SET role = 'user' WHERE role IS NULL;

-- 3. 인덱스 생성 (role 기반 조회 성능)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. RLS 정책: 본인 정보만 조회 가능
-- 이미 있을 수 있으므로 DROP 후 CREATE
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (id = auth.uid());

-- 5. 관리자는 모든 사용자 조회 가능
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Admins can view all users" 
  ON users FOR SELECT 
  USING (
    role = 'admin' 
    AND id = auth.uid()
  );

-- 6. 본인 정보만 수정 가능
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7. role 변경은 관리자만 가능
-- 관리자 수동 지정 시 사용 (초기 관리자 설정)
-- 예시: UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

COMMENT ON COLUMN users.role IS '사용자 권한 (user: 일반, admin: 관리자)';
