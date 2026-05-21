# Revision System (버전 관리)

> 작성일: 2026-05-21
> 목적: CMS 핵심 기능 — 자동 저장 및 복원 시스템

---

## 개요

**핵심 원칙**: revision은 "백업"이 아닌 "snapshot"

```
┌────────────────────────────────────┐
│  revision = 전체 게시글 상태 snapshot  │
│  ├── title                          │
│  ├── content                        │
│  ├── excerpt                        │
│  ├── meta_title                     │
│  ├── meta_description               │
│  ├── cover_image                    │
│  ├── cover_image_alt                │
│  └── slug (조회만, 복원 제외)          │
└────────────────────────────────────┘
```

---

## Autosave 정책

### Debounce
- **기존**: 10초마다 interval
- **현재**: 마지막 입력 후 10초 debounce
- **이유**: 불필요한 저장 감소, 서버 부하 ↓

### 루프 방지
```typescript
isRestoringRevisionRef = useRef(false)

// 복원 중 → autosave skip
// 복원 후 500ms 지연 → 플래그 해제
```

**문제**: 복원 시 자동 저장 트리거 → 새 revision 생성 → 무한 루프
**해결**: ref 플래그로 완전 차단

---

## Retention Policy

| 항목 | 정책 |
|------|------|
| 최대 개수 | 30개 |
| 초과 처리 | 오래된 것 자동 삭제 (created_at 기준) |
| unique 제약 | (post_id, revision_number) UNIQUE |

**이유**: DB 용량 관리, race condition 방지

---

## 복원 정책 (Critical)

### 복원되는 것 ✅
- title, content, excerpt
- meta_title, meta_description
- cover_image, cover_image_alt

### 복원되지 않는 것 ❌
- **slug** (현재 URL 유지 필수)

**이유**: slug 변경 시 404 폭증, SEO 손실, 외부링크 깨짐

---

## DB Schema

```sql
post_revisions
- id (UUID, PK)
- post_id (UUID, FK → posts.id, ON DELETE CASCADE)
- revision_number (INTEGER, UNIQUE with post_id)
- title (TEXT)
- content (TEXT)
- excerpt (TEXT, nullable)
- meta_title (TEXT, nullable)
- meta_description (TEXT, nullable)
- cover_image (TEXT, nullable)
- cover_image_alt (TEXT, nullable)
- slug (TEXT, nullable) -- 조회용, 복원 제외
- created_at (TIMESTAMP, DEFAULT NOW())

INDEX: (post_id), (post_id, revision_number DESC)
CONSTRAINT: UNIQUE (post_id, revision_number)
```

---

## 향후 개선 (Phase 2+)

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| revision diff UI | 1순위 | 변경사항 시각화 |
| draft/published 분리 | 2순위 | 미리보기 → 발행 구조 |
| AI 수정 이력 | 3순위 | AI 생성 표시, hallucination 추적 |
| scheduled publish | 4순위 | 예약 발행 |
| audit log | 5순위 | 누가 언제 복원했는지 |

---

## 중요 결정 사항

1. **slug 복원 금지**: SEO/링크 안정성 최우선
2. **autosave debounce**: 서버 비용 vs 사용자 편의 균형
3. **30개 제한**: 실무 운영 가능한 용량
4. **created_at 기준 삭제**: revision_number보다 안정적

---

## 운영 주의사항

- revision 복원 시 **권한 체크**: post.author_id === currentUser.id
- 이미지 복원 시 **존재 여부 확인**: 404 이미지 방지
- 대량 삭제 시 **Soft Delete 고려**: 실수 복구용
