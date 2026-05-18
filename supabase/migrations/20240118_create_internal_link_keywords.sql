-- 내부링크 키워드 관리 테이블 생성

create table if not exists internal_link_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text unique not null,
  url text not null,
  priority integer default 50,
  category text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 인덱스 생성
comment on table internal_link_keywords is '내부링크 자동 변환 키워드 관리';
comment on column internal_link_keywords.keyword is '검색/변환 대상 키워드 (3글자 이상 권장)';
comment on column internal_link_keywords.url is '링크될 URL';
comment on column internal_link_keywords.priority is '우선순위 (높을수록 먼저 매칭, 0-100)';
comment on column internal_link_keywords.category is '카테고리 (형사, 민사 등)';
comment on column internal_link_keywords.is_active is '활성화 여부';

-- 기존 키워드 마이그레이션용 (25개)
insert into internal_link_keywords (keyword, url, priority, category, is_active) values
('형사 고소', '/cases/형사·고소', 100, '형사', true),
('고소장', '/cases/형사·고소', 90, '형사', true),
('불송치', '/cases/형사·고소', 85, '형사', true),
('경찰 조사', '/cases/형사·고소', 85, '형사', true),
('검찰 조사', '/cases/형사·고소', 85, '형사', true),
('손해배상', '/cases/민사', 95, '민사', true),
('강제집행', '/cases/강제집행', 95, '강제집행', true),
('동산압류', '/cases/강제집행', 90, '강제집행', true),
('부동산압류', '/cases/강제집행', 90, '강제집행', true),
('지급명령', '/cases/강제집행', 85, '강제집행', true),
('이의신청', '/cases/강제집행', 85, '강제집행', true),
('전세금 반환', '/cases/전세·임대차', 100, '전세', true),
('전세사기', '/cases/전세·임대차', 95, '전세', true),
('보증금 반환', '/cases/전세·임대차', 95, '전세', true),
('임차권', '/cases/전세·임대차', 85, '전세', true),
('우선변제권', '/cases/전세·임대차', 85, '전세', true),
('확정일자', '/cases/전세·임대차', 80, '전세', true),
('개인회생', '/cases/채무', 95, '채무', true),
('한정승인', '/cases/상속', 95, '상속', true),
('상속포기', '/cases/상속', 95, '상속', true),
('양육권', '/cases/이혼', 90, '이혼', true),
('부당해고', '/cases/노동', 95, '노동', true),
('산업재해', '/cases/노동', 95, '노동', true),
('세무조사', '/cases/세금', 90, '세금', true),
('행정심판', '/cases/행정', 90, '행정', true)
on conflict (keyword) do nothing;
