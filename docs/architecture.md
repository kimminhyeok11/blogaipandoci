# CMS Architecture & Policy

> 작성일: 2026-05-21
> 목적: 핵심 설계 결정 및 운영 정책 문서화

---

## 1. Taxonomy (정보구조)

### 3계층 구조

```
cases (Primary Category)        ← 독립 검색 intent, 콘텐츠 허브
├── 형사, 민사, 이혼·가족, 노동, 부동산, 학교폭력, 지식재산권 (한글 slug)
└── 교통사고, 회생·파산 (영어 slug, 신규)

tags (Secondary Keywords)       ← 세부 키워드
└── 음주운전, 폭행, 합의금, 양육권...

situations (Intent Landing)     ← 대화형 검색
└── "교통사고 뺑소니 처벌은?"
```

### slug 정책 (mixed)

| 구분 | slug | 이유 |
|------|------|------|
| 기존 7개 | 한글 (`형사`, `민사`...) | 운영 안정성 우선 |
| 신규 2개 | 영어 (`traffic-accident`) | 향후 확장성 |

**결정**: 운영 중인 사이트의 안정성 > URL 미관

---

## 2. SEO Policy

### 404 정책

| 상황 | 처리 | 이유 |
|------|------|------|
| DB 없음 | 404 | 존재하지 않음 |
| DB 있음, 글 0개 | Empty State (noindex) | soft 404 방지 |

### Indexability

| 페이지 | 조건 | robots |
|--------|------|--------|
| category | 글 1+ | index,follow |
| category | 글 0 | noindex,follow |
| tag | 글 3+ | index,follow |
| tag | 글 0~2 | noindex,follow |

**noindex,follow 선택 이유**: 내부링크 equity 유지, crawl continuity

### Sitemap

- 포함: 글 3개+ tags, 모든 categories, published posts
- 제외: 글 2개 미만 tags, draft posts

---

## 3. Revision System

### 핵심 원칙

**revision = 전체 게시글 snapshot** (백업 아님)

### 저장 항목
- title, content, excerpt
- meta_title, meta_description
- cover_image, cover_image_alt
- **slug (조회만, 복원 제외)** ← URL 안정성

### Autosave
- debounce: 마지막 입력 후 10초
- 루프 방지: `isRestoringRevisionRef` 플래그

### Retention
- 최대 30개
- 초과 시 created_at 기준 삭제
- UNIQUE: (post_id, revision_number)

---

## 4. DB Schema Highlights

```sql
-- categories: 핵심 분류
categories (id, name, slug, seo_*, post_count, is_active)

-- posts: category_id FK (기존 case_type deprecated)
posts (..., category_id UUID REFERENCES categories(id))

-- revisions: 버전 관리
post_revisions (post_id, revision_number, title, content, meta_*, slug)
```

---

## 5. 운영 체크리스트 (배포 후)

| 지표 | 기대 | 주기 |
|------|------|------|
| Soft 404 | 감소 | 1주 |
| Excluded by noindex | 증가 (정상) | 1주 |
| Vercel 에러 | 0 | 즉시 |
| Supabase 쿼리 비용 | 안정 | 1주 |

---

## 6. 향후 로드맵

### Phase 2 — Category Hub 강화
- `intro_content`, `faq_content` 필드
- 대표글 고정 (`featured_post_id`)
- 관련 태그/상황 자동 연결

### Phase 3 — Semantic Linking
- 본문 키워드 → 태그 자동 링크
- revision diff UI
- AI 생성 이력 추적

---

## 중요 결정 사항

1. **slug 복원 금지**: SEO/링크 안정성
2. **mixed slug**: 운영 안정성 우선
3. **empty state 404 아님**: soft 404 방지
4. **noindex,follow**: 내부링크 equity 유지
