-- 법률 Q&A 플랫폼 리모델링 - 댓글/질문 카드 시스템

-- comments 테이블 (질문 카드 중심)
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  nickname text,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('public','hidden','pending','deleted','law_risk')),
  risk_score int DEFAULT 0,
  question_type text,
  topic_tags text[] DEFAULT '{}',
  like_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  view_count int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_topic_tags ON comments USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_question_type ON comments(question_type);

-- comment_history 테이블 (수정 기록)
CREATE TABLE IF NOT EXISTS comment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  old_content text NOT NULL,
  new_content text NOT NULL,
  edited_by uuid REFERENCES users(id) ON DELETE CASCADE,
  edited_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_history_comment_id ON comment_history(comment_id);

-- comment_likes 테이블 (좋아요)
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- comment_reports 테이블 (신고 기능)
CREATE TABLE IF NOT EXISTS comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);

-- RLS 정책
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public comments" ON comments;
CREATE POLICY "Anyone can view public comments" ON comments
  FOR SELECT USING (status = 'public');

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can manage all comments" ON comments;
CREATE POLICY "Admins can manage all comments" ON comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE comment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view history" ON comment_history;
CREATE POLICY "Users can view history" ON comment_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert history" ON comment_history;
CREATE POLICY "System can insert history" ON comment_history
  FOR INSERT WITH CHECK (true);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON comment_likes;
CREATE POLICY "Anyone can view likes" ON comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Logged in users can like" ON comment_likes;
CREATE POLICY "Logged in users can like" ON comment_likes
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can report" ON comment_reports;
CREATE POLICY "Anyone can report" ON comment_reports
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view reports" ON comment_reports;
CREATE POLICY "Admins can view reports" ON comment_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
