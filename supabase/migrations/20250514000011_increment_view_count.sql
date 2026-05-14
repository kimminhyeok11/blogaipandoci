-- view_count atomic 증가 함수 (race condition 방지)
-- read-then-write 패턴 대신 DB 레벨에서 원자적 증가

CREATE OR REPLACE FUNCTION public.increment_view_count(post_slug text)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE slug = post_slug AND published = true;
$$;
