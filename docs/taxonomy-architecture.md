# Taxonomy Architecture (정보구조)

> 작성일: 2026-05-21
> 목적: 사이트 핵심 분류 체계 문서화

---

## 3계층 Taxonomy 구조

```
┌─────────────────────────────────────────────────────────┐
│  cases (Primary Category)                               │
│  ├── 형사, 민사, 이혼·가족, 노동, 부동산, 학교폭력, 지식재산권  │
│  ├── 교통사고 (신규), 회생·파산 (신규)                     │
│  └── 독립 검색 intent + 콘텐츠 허브 역할                    │
├─────────────────────────────────────────────────────────┤
│  tags (Secondary Keywords)                              │
│  └── 음주운전, 폭행, 명예훼손, 합의금, 양육권...            │
│  └── 세부 사건/행위/논점                                  │
├─────────────────────────────────────────────────────────┤
│  situations (Intent Landing)                          │
│  └── "교통사고 뺑소니 처벌은?", "임금체불 소송절차"         │
│  └── 대화형 검색 intent 대응                              │
└─────────────────────────────────────────────────────────┘
```

---

## slug 정책 (2026-05-21 기준)

| 구분 | slug | 비고 |
|------|------|------|
| 기존 7개 | 한글 (`형사`, `민사`...) | 운영 안정성 유지 |
| 신규 2개 | 영어 (`traffic-accident`, `bankruptcy`) | 향후 확장성 |

**mixed slug 전략**: 운영 중인 사이트의 안정성을 우선으로 한 현실적 선택

---

## DB Schema

```sql
categories
- id (UUID, PK)
- name (TEXT, 한글명, UNIQUE)
- slug (TEXT, mixed, UNIQUE)
- description (TEXT)
- seo_title (TEXT)
- seo_description (TEXT)
- post_count (INTEGER, denormalized)
- is_active (BOOLEAN)
- created_at / updated_at (TIMESTAMP)
```

**posts.category_id**: FK로 categories 참조 (기존 case_type 문자열 deprecated)

---

## SEO 활용 전략

| 계층 | 목적 | index 정책 |
|------|------|----------|
| cases | topical authority hub | index (글 1개 이상) |
| tags | long-tail keyword | index (글 3개 이상), noindex (미만) |
| situations | conversational intent | index (품질 기준 충족 시) |

---

## 향후 확장 로드맵

### Phase 2 — Category Hub 강화
- `intro_content`: 카테고리 상단 SEO 본문
- `faq_content`: FAQ Schema
- `featured_post_id`: 대표글 고정
- `hero_image`: OG/브랜딩

### Phase 3 — Semantic Linking
- 본문 키워드 → 태그 자동 링크
- 관련글 추천 알고리즘
- category-tag-post cluster 시각화

---

## 중요 결정 사항

1. **slug 영문화 지연**: 기존 7개는 나중에 별도 migration 프로젝트로 진행
2. **thin content noindex**: 태그 3개 미만은 noindex,follow
3. **empty state 허용**: 글 없는 category도 404 아님 (글쓰기 유도)
