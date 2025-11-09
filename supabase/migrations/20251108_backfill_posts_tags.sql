-- Backfill posts.tags from hidden data-tags in refined_content
-- Normalize to lower-case and trim, only update when tags is empty

WITH pairs AS (
  SELECT p.id,
         regexp_split_to_array(
           substring(p.refined_content FROM 'data-tags="([^"]+)"'),
           ','
         ) AS raw_tags
  FROM posts p
), norm AS (
  SELECT id,
         ARRAY(
           SELECT lower(trim(t))
           FROM unnest(raw_tags) AS t
           WHERE trim(t) <> ''
         ) AS tags_lower
  FROM pairs
)
UPDATE posts AS p
SET tags = COALESCE(p.tags, norm.tags_lower)
FROM norm
WHERE p.id = norm.id
  AND (p.tags IS NULL OR array_length(p.tags,1) IS NULL OR array_length(p.tags,1) = 0)
  AND array_length(norm.tags_lower,1) > 0;