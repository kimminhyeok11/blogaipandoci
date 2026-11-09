-- pgvector HNSW 인덱스 — 기존 IVFFLAT은 데이터를 먼저 학습해야 하고
-- 행이 적을 때 recall이 불안정하다. HNSW는 소규모~대규모 모두 정확도·지연이
-- 우수해 관련글(match_similar_posts) 품질을 안정시킨다. 기존 인덱스 유지,
-- 신규 HNSW 추가 — 플래너가 더 나은 쪽을 선택한다.
CREATE INDEX IF NOT EXISTS posts_embedding_hnsw_idx
  ON posts USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS posts_process_embedding_hnsw_idx
  ON posts USING hnsw (process_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
