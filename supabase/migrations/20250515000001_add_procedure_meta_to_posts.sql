-- posts 테이블에 절차 네비게이션 메타데이터 컬럼 추가
-- 기존 서비스에 영향 없도록 모두 nullable (기존 글은 null → 아무것도 표시 안 함)

-- 사건 유형 (상속·유언, 채무·금전, 형사·고소 등)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS case_type TEXT;

-- 현재 단계 (예: 한정승인, 채권자집회, 지급명령 송달)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS current_stage TEXT;

-- 다음 단계 (예: 경매, 답변서 제출, 강제집행)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS next_stage TEXT;

-- 예상 소요 기간 (예: "2~4주", "1년 이상")
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS estimated_duration TEXT;

-- 직접 방문 기관 목록 (예: {"법원","은행","보험사"})
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS involved_agencies TEXT[];

-- 자주 하는 실수 목록
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS common_mistakes TEXT[];

-- 전문가 도움 필요도 (직접가능 / 법무사권장 / 변호사권장)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS expert_level TEXT;

-- 인덱스 (사건 유형별 필터링 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_case_type
  ON public.posts(case_type) WHERE case_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_current_stage
  ON public.posts(current_stage) WHERE current_stage IS NOT NULL;
