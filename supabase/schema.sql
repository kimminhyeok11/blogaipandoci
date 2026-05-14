-- =============================================================================
-- 法 BLOG - 현행 데이터베이스 스키마 (단일 진실 소스)
-- 최종 업데이트: 2025-05-14
-- =============================================================================
-- ※ 이 파일은 현재 Supabase에 적용된 전체 스키마를 정리한 참조용 파일입니다.
-- ※ 실제 마이그레이션은 migrations/ 폴더의 파일들로 관리됩니다.
-- ※ DB 구조 변경 시 이 파일도 함께 업데이트 하세요.
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
-- gen_random_uuid() 사용을 위해 pgcrypto 필요 (Supabase 기본 활성화됨)


-- =============================================================================
-- 2. public.users (Supabase auth.users와 1:1 연동)
-- =============================================================================
-- 수집 목적: 회원 식별, 닉네임·역할 관리
-- 탈퇴 시: auth.users 삭제 → CASCADE로 자동 삭제
-- 탈퇴 전: trg_anonymize_comments_on_user_delete 트리거가 comments.nickname 익명화
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  nickname    TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 신규 가입 시 public.users 자동 생성 (이메일·카카오 OAuth 모두 처리)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nickname TEXT;
  v_email    TEXT;
BEGIN
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  v_nickname := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'nickname', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(v_email, '@', 1), ''),
    'user_' || LEFT(NEW.id::text, 8)
  );
  INSERT INTO public.users (id, email, nickname, created_at, updated_at)
  VALUES (NEW.id, v_email, v_nickname, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 3. public.posts
-- =============================================================================
-- 글 작성은 관리자(admin)만 가능 (UI 레벨에서도 제한)
CREATE TABLE IF NOT EXISTS public.posts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  content          TEXT NOT NULL,
  excerpt          TEXT,
  cover_image      TEXT,
  cover_image_alt  TEXT,
  published        BOOLEAN DEFAULT FALSE,
  featured         BOOLEAN DEFAULT FALSE,
  view_count       INTEGER DEFAULT 0,
  meta_title       TEXT,
  meta_description TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id      ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug         ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published    ON public.posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured     ON public.posts(featured) WHERE featured = TRUE;


-- =============================================================================
-- 4. public.tags / post_tags
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id  UUID REFERENCES public.tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);


-- =============================================================================
-- 5. public.images
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.images (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  url        TEXT NOT NULL,
  alt        TEXT,
  width      INTEGER,
  height     INTEGER,
  size       INTEGER,
  mime_type  TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================================================
-- 6. public.post_views (조회수 추적)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.post_views (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id   UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_hash   TEXT  -- 해시된 IP (중복 방지용, 원본 IP 미저장)
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id   ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON public.post_views(viewed_at DESC);


-- =============================================================================
-- 7. public.comments (법률 Q&A 질문 카드 + 답글)
-- =============================================================================
-- parent_id NULL  = 최상위 질문 카드
-- parent_id 있음 = 답글 (관리자 또는 사용자)
-- status 값:
--   pending  : 등록 후 검토 대기 (기본값)
--   public   : 검토 완료, 공개
--   hidden   : 운영자 비공개 처리
--   deleted  : 소프트 삭제 (deleted_at 필드 사용)
--   law_risk : 개인정보·법적 위험 감지 (risk_score > 50)
--
-- 비밀 질문(is_secret=true):
--   - API 레벨에서 작성자 본인 + admin만 content 노출
--   - 다른 사용자에게는 "🔒 비밀 질문입니다." 로 마스킹
--   - 네트워크 응답 자체가 마스킹되어 DevTools에서도 열람 불가
--
-- 탈퇴 회원 처리 (ON DELETE SET NULL):
--   - 탈퇴 전: trg_anonymize_comments_on_user_delete 트리거 실행
--             → nickname = '탈퇴한 사용자', is_anonymous = true
--   - 탈퇴 후: user_id = NULL (식별정보 제거), 내용은 익명 상태로 유지
--   - 이유: SEO 콘텐츠 보존 + 개인정보보호법/GDPR 잊혀질 권리 준수
CREATE TABLE IF NOT EXISTS public.comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- 탈퇴 시 NULL
  nickname         TEXT,
  content          TEXT NOT NULL,
  is_anonymous     BOOLEAN DEFAULT FALSE,
  is_secret        BOOLEAN DEFAULT FALSE,  -- 비밀 질문 여부
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('public','hidden','pending','deleted','law_risk')),
  risk_score       INT DEFAULT 0,          -- PII 위험도 점수 (0~100)
  question_type    TEXT,                   -- 질문 유형 (본인/부모/배우자 등)
  topic_tags       TEXT[] DEFAULT '{}',    -- 법률 분야 태그
  context_answers  JSONB DEFAULT '{}',     -- 질문 작성 시 구조화된 컨텍스트
  is_edited        BOOLEAN DEFAULT FALSE,
  edited_at        TIMESTAMP WITH TIME ZONE,
  like_count       INT DEFAULT 0,
  reply_count      INT DEFAULT 0,
  view_count       INT DEFAULT 0,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at       TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id      ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id      ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id    ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status       ON public.comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_topic_tags   ON public.comments USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_comments_created_at   ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_question_type ON public.comments(question_type);

-- 탈퇴 전 댓글 익명화 트리거 (BEFORE DELETE라 user_id가 아직 살아있을 때 실행)
CREATE OR REPLACE FUNCTION public.anonymize_comments_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments
    SET nickname     = '탈퇴한 사용자',
        is_anonymous = TRUE,
        updated_at   = NOW()
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_anonymize_comments_on_user_delete ON public.users;
CREATE TRIGGER trg_anonymize_comments_on_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.anonymize_comments_on_user_delete();


-- =============================================================================
-- 8. public.comment_history (댓글 수정 이력)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comment_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_by   UUID REFERENCES public.users(id) ON DELETE CASCADE,
  edited_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_history_comment_id ON public.comment_history(comment_id);


-- =============================================================================
-- 9. public.comment_likes
-- =============================================================================
-- 탈퇴 시 ON DELETE CASCADE (개인 행동 데이터, 보관 근거 없음)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id    ON public.comment_likes(user_id);


-- =============================================================================
-- 10. public.comment_reports (신고)
-- =============================================================================
-- 신고자 탈퇴 시 reporter_id = NULL (신고 기록 자체는 운영 목적으로 유지)
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON public.comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status     ON public.comment_reports(status);


-- =============================================================================
-- 11. TRIGGERS - updated_at 자동 갱신
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_posts_updated_at    ON public.posts;
DROP TRIGGER IF EXISTS update_users_updated_at    ON public.users;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_all"    ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "users_insert_own"    ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own"    ON public.users FOR UPDATE USING (auth.uid() = id);

-- posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select_published" ON public.posts FOR SELECT USING (published = TRUE);
CREATE POLICY "posts_select_own"       ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "posts_insert_own"       ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own"       ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own"       ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- tags / post_tags
ALTER TABLE public.tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_select_all"         ON public.tags      FOR SELECT USING (TRUE);
CREATE POLICY "tags_insert_auth"        ON public.tags      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "post_tags_select_all"    ON public.post_tags FOR SELECT USING (TRUE);
CREATE POLICY "post_tags_manage_author" ON public.post_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_tags.post_id AND posts.user_id = auth.uid()));

-- images
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_select_all"    ON public.images FOR SELECT USING (TRUE);
CREATE POLICY "images_insert_auth"   ON public.images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_delete_own"    ON public.images FOR DELETE USING (auth.uid() = user_id);

-- comments (API는 service_role로 RLS 우회 처리, RLS는 직접 클라이언트 접근 방어용)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_public"   ON public.comments FOR SELECT USING (status = 'public');
CREATE POLICY "comments_insert_any"      ON public.comments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "comments_update_own"      ON public.comments FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "comments_admin_all"       ON public.comments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- comment_history
ALTER TABLE public.comment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_history_select_all"  ON public.comment_history FOR SELECT USING (TRUE);
CREATE POLICY "comment_history_insert_any"  ON public.comment_history FOR INSERT WITH CHECK (TRUE);

-- comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes_select_all"  ON public.comment_likes FOR SELECT USING (TRUE);
CREATE POLICY "comment_likes_manage_own"  ON public.comment_likes FOR ALL USING (auth.uid() = user_id);

-- comment_reports
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_reports_insert_any"    ON public.comment_reports FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "comment_reports_select_admin"  ON public.comment_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


-- =============================================================================
-- 13. STORAGE
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_images_select_all"  ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "storage_images_insert_auth" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
CREATE POLICY "storage_images_delete_own"  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.uid() = owner);


-- =============================================================================
-- 14. GRANTS
-- =============================================================================
GRANT ALL    ON public.users        TO authenticated, service_role;
GRANT SELECT ON public.users        TO anon;
GRANT ALL    ON public.posts        TO authenticated, service_role;
GRANT SELECT ON public.posts        TO anon;
GRANT ALL    ON public.tags         TO authenticated, service_role;
GRANT SELECT ON public.tags         TO anon;
GRANT ALL    ON public.post_tags    TO authenticated, service_role;
GRANT SELECT ON public.post_tags    TO anon;
GRANT ALL    ON public.images       TO authenticated, service_role;
GRANT SELECT ON public.images       TO anon;
GRANT ALL    ON public.comments     TO authenticated, service_role;
GRANT SELECT ON public.comments     TO anon;
GRANT ALL    ON public.comment_likes    TO authenticated, service_role;
GRANT ALL    ON public.comment_reports  TO authenticated, service_role;
GRANT ALL    ON public.comment_history  TO authenticated, service_role;
GRANT ALL    ON public.post_views       TO authenticated, service_role;
GRANT SELECT ON public.post_views       TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
