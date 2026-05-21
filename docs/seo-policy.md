# SEO Policy (검색엔진 정책)

> 작성일: 2026-05-21
> 목적: 크롤링, 색인, 404 정책 표준화

---

## 404 정책 (Critical)

### 존재하지 않는 taxonomy → 404
- DB에 없는 category slug
- DB에 없는 tag slug
- 존재하지 않는 post slug

### 존재하나 데이터 없음 → Empty State (404 아님)
- DB에 있는 category, 글 0개 → 빈 상태 페이지 (noindex)
- DB에 있는 tag, 글 0개 → 빈 상태 페이지 (noindex)

**이유**: soft 404 방지, 사용자 글쓰기 유도, 내부링크 구조 유지

---

## Indexability Control

| 페이지 유형 | 글 개수 | robots | 이유 |
|------------|--------|--------|------|
| category | 1+ | index,follow | topical authority |
| category | 0 | noindex,follow | thin content 방지 |
| tag | 3+ | index,follow | long-tail 효율 |
| tag | 0~2 | noindex,follow | thin content 방지 |
| post | published | index,follow | 핵심 콘텐츠 |
| post | draft | noindex | 미완성 콘텐츠 |

**noindex,follow 선택 이유**: 내부링크 equity 유지, crawl continuity 확보

---

## URL 정책

### Canonical
- `/cases/[slug]` — category canonical
- `/tags/[tag]` — tag canonical (encodeURIComponent 사용)
- `/posts/[slug]` — post canonical

### Redirect
- `/categories` → `/cases` (301 permanent)
- 잘못된 slug → 올바른 slug (301, 매핑 테이블 기반)

---

## Sitemap Policy

| 포함 | 제외 |
|------|------|
| 글 3개 이상인 tags | 글 2개 미만인 tags |
| 모든 categories (글 0개도) | draft posts |
| published posts | thin content pages |

---

## 에러 처리 정책

| 상황 | HTTP Status | 처리 |
|------|-------------|------|
| slug 없음 | 404 | notFound() |
| DB 오류 | 500 | throw error (no catch) |
| parsing 실패 | 500 | throw error |
| 잘못된 파라미터 | 400 | graceful fallback |

**원칙**: 500을 404로 숨기지 않음 (운영 장애 vs 없는 페이지 구분)

---

## 중요 판단 기준

### 왜 noindex,follow인가?
- `follow` 유지 → 내부링크 crawl 가능
- `noindex` → thin content index 방지
- 많은 사이트가 `noindex,nofollow`로 링크 equity 손실

### 왜 empty state를 404로 안 하는가?
- soft 404는 Google 품질 점수 하락
- 빈 카테고리도 미래 콘텐츠 확보 가능성
- 사용자 글쓰기 진입점 제공

---

## 모니터링 지표

| 지표 | 기대 변화 | 확인 주기 |
|------|----------|----------|
| Soft 404 | 감소 | 1주일 |
| Excluded by noindex | 증가 (정상) | 1주일 |
| Crawled - not indexed | 안정화 | 2주일 |
| Coverage Errors | 감소 | 즉시 |
