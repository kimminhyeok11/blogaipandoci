-- 현재 글의 embedding으로 유사 댓글(질문+답변) 검색
-- posts.embedding → 유사 comments 반환

CREATE OR REPLACE FUNCTION public.match_comments_by_post(
  p_post_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  question_type text,
  topic_tags text[],
  like_count int,
  reply_count int,
  post_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.content,
    c.question_type,
    c.topic_tags,
    c.like_count,
    c.reply_count,
    c.post_id,
    1 - (c.embedding <=> p.embedding) AS similarity
  FROM public.comments c
  CROSS JOIN (
    SELECT embedding FROM public.posts WHERE id = p_post_id
  ) p
  WHERE
    c.status = 'public'
    AND c.post_id != p_post_id
    AND c.deleted_at IS NULL
    AND c.embedding IS NOT NULL
    AND p.embedding IS NOT NULL
  ORDER BY c.embedding <=> p.embedding
  LIMIT match_count;
$$;
