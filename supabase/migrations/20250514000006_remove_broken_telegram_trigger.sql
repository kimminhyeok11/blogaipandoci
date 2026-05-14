-- pg_net extension 미활성화로 인한 net.http_post 오류 수정
-- on_comment_insert 트리거가 댓글 INSERT 시마다 500 에러를 유발하므로 제거
-- 텔레그램 알림이 필요하면 API 레이어(route.ts)에서 처리할 것

DROP TRIGGER IF EXISTS on_comment_insert ON public.comments;
DROP FUNCTION IF EXISTS public.notify_telegram_on_comment();
