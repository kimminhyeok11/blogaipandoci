-- 탈퇴 회원 댓글 처리: CASCADE → SET NULL
-- 이유:
--   1. SEO: 댓글/Q&A 콘텐츠 URL 보존 (삭제 시 색인 손실)
--   2. 개인정보보호법/GDPR: 식별정보(user_id, nickname) 제거 = "잊혀질 권리" 충족
--   3. 서비스 품질: Q&A 스레드 구조 유지

-- 기존 FK 제약 제거
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

-- SET NULL로 재설정 (탈퇴 시 user_id → NULL, nickname은 트리거로 처리)
ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- comment_likes: 탈퇴 시 좋아요 기록 삭제 (개인 행동 데이터)
ALTER TABLE public.comment_likes
  DROP CONSTRAINT IF EXISTS comment_likes_user_id_fkey;
ALTER TABLE public.comment_likes
  ADD CONSTRAINT comment_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- comment_reports: 신고자 정보 삭제 (개인 행동 데이터)
ALTER TABLE public.comment_reports
  DROP CONSTRAINT IF EXISTS comment_reports_reporter_id_fkey;
ALTER TABLE public.comment_reports
  ADD CONSTRAINT comment_reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 탈퇴 시 댓글 닉네임 익명화 트리거
CREATE OR REPLACE FUNCTION public.anonymize_comments_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- 탈퇴한 사용자의 댓글 닉네임을 익명으로 변경
  UPDATE public.comments
    SET nickname = '탈퇴한 사용자',
        is_anonymous = true,
        updated_at = NOW()
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_anonymize_comments_on_user_delete ON public.users;
CREATE TRIGGER trg_anonymize_comments_on_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_comments_on_user_delete();
