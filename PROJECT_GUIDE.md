# 프로젝트 가이드 - 法 BLOG (lawtiphub.com)

> **최종 업데이트:** 2026년 5월 14일

---

## 1. 프로젝트 개요

법률·정책·사회 분야 블로그 플랫폼.  
관리자가 글을 발행하고, 독자가 질문을 남기면 유사 사례를 AI 벡터 검색으로 추천하는 구조.

- **Next.js 14 App Router** + TypeScript
- **Supabase** (PostgreSQL + pgvector + Storage + Auth)
- **OpenAI** text-embedding-3-small (벡터 생성 전용)
- **Vercel** 배포 / GitHub 자동 CI/CD

---

## 2. 3대 구성요소 역할

```
OpenAI           → 텍스트를 1536차원 숫자 배열(벡터)로 변환만 함
                   발행/질문 등록 시 1회 호출, 읽을 때는 호출 없음

Supabase         → 모든 데이터 저장소
                   posts, comments, users, tags 등 + embedding 벡터 컬럼
                   벡터끼리 유사도 계산도 DB 내부에서 처리 (pgvector)

내 사이트(Next.js) → 사용자 ↔ Supabase/OpenAI 연결
                   API Routes: 인증 검증, 데이터 CRUD, 벡터 저장 트리거
```

---

## 3. 인증 및 보안 구조

### 3.1 인증 흐름 (모든 보호 API 공통)

```
클라이언트 useAuth() → session.access_token (Supabase JWT)
       ↓
API 호출 시: Authorization: Bearer <JWT>
       ↓
서버 API:
  1. anon.auth.getUser(token) → Supabase 서명 검증
  2. 검증된 user.id로 users 테이블 role 조회
  3. 통과 시 serviceRole 클라이언트로 DB 작업
```

> **⚠️ 절대 금지:** `Authorization` 헤더 값을 그대로 UUID로 사용하면 안 됨.
> 반드시 `anon.auth.getUser(token)`으로 검증 후 `user.id` 추출할 것.

### 3.2 권한별 접근 제어

| 기능 | 필요 권한 | 검증 위치 |
|------|---------|---------|
| 글 발행/수정/삭제 | admin | API 서버 |
| 이미지 업로드 | 로그인 | API 서버 |
| 질문 등록 | 누구나 (익명 포함) | — |
| 댓글 수정/삭제 | 본인 또는 admin | API 서버 |
| 관리자 통계/댓글/신고 | admin | API 서버 |
| 글 읽기 / 유사 사례 | 누구나 | — |

### 3.3 클라이언트 측 인증 상태

`AuthProvider` → `useAuth()` 훅으로 전역 제공:
```typescript
const { user, session, role, isLoading } = useAuth();
// session.access_token → API 호출 시 Bearer 토큰으로 사용
```

---

## 4. AI + 벡터 검색 구조

### 4.1 벡터가 생성되는 시점

**글 발행 시** (`POST/PUT /api/posts`):
```
글 DB 저장 (즉시) → 백그라운드 비동기:
  제목 + 요약 + 본문 → OpenAI → 벡터 → posts.embedding 저장
```

**질문 등록 시** (`POST /api/comments`):
```
댓글 DB 저장 (즉시) → 백그라운드 비동기:
  question_type + topic_tags + 내용 → OpenAI → 벡터 → comments.embedding 저장
```

> AI 실패해도 글/질문 등록 자체는 영향 없음. 벡터만 null로 남고 fallback 검색 사용.

### 4.2 AI 오류 방어 코드 (posts/route.ts, comments/route.ts)

```typescript
.then(embRes => {
  if (embRes?.error) { console.error(...); return; }         // OpenAI 오류 응답
  const vec = embRes?.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length !== 1536) { ... return; } // 차원 검증
  supabase.from(...).update({ embedding: vec })...           // 정상 저장
}).catch(err => { console.error(...); });                    // 네트워크 오류
```

### 4.3 유사 사례 검색 3단계 fallback

독자가 글을 읽을 때 `SimilarCases` 컴포넌트가 마운트되면:

```
1차: POST /api/comments/similar-by-post
     현재 글 embedding ↔ 다른 글 질문 embedding 코사인 유사도 (DB 내부)
     → Supabase RPC: match_comments_by_post()
     결과 없으면 ↓

2차: PUT /api/embeddings
     questionType + topicTags 텍스트 → OpenAI → 벡터 → DB 검색
     → Supabase RPC: match_similar_comments()
     결과 없으면 ↓

3차: GET /api/comments/similar
     question_type, topic_tags exact match (AI 없음, 완전 자체 DB 쿼리)
     항상 작동 보장
```

> **pgvector 필수:** Supabase 대시보드 → Database → Extensions → `vector` 활성화 필요.
> 비활성화 시 1·2차 실패, 3차 fallback으로만 작동.

### 4.4 관련 글 자동 삽입 (AI 없음)

글 발행 시 `findRelatedPosts()` → `appendRelatedLinks()`:
- 기존 발행 글 200개 조회
- 제목 간 Jaccard 유사도(2-gram) 50% + 부분 문자열 30% + 키워드 20% 점수화
- 유사도 0.1 이상 상위 5개를 본문 하단 `### 📌 관련 글` 섹션에 마크다운 링크 삽입
- 재발행 시 기존 섹션 제거 후 새로 삽입 (중복 방지)

---

## 5. 폴더 구조

```
src/
├── app/
│   ├── api/
│   │   ├── posts/route.ts              # 글 목록/생성/수정 (관리자 전용 발행)
│   │   ├── posts/[slug]/route.ts       # 글 상세/수정모드/삭제
│   │   ├── comments/route.ts           # 질문/댓글 목록/등록
│   │   ├── comments/[id]/route.ts      # 댓글 수정/삭제
│   │   ├── comments/similar/route.ts   # 3차 fallback: 태그 기반 유사 질문
│   │   ├── comments/similar-by-post/   # 1차: 글 embedding 기반 유사 질문
│   │   ├── embeddings/route.ts         # 2차: semantic search + 관리자 embedding 수동 생성
│   │   ├── upload/route.ts             # 이미지 업로드 (WebP 변환)
│   │   ├── revisions/route.ts          # 글 수정 이력
│   │   ├── tags/route.ts               # 태그 관리
│   │   ├── stats/route.ts              # 관리자 통계
│   │   ├── admin/
│   │   │   ├── comments/[id]/approve/  # 댓글 승인
│   │   │   ├── comments/[id]/hide/     # 댓글 숨김
│   │   │   ├── reports/route.ts        # 신고 목록/처리
│   │   │   └── images/route.ts         # 고아 이미지 관리
│   │   └── users/
│   │       ├── me/route.ts             # 회원 탈퇴
│   │       └── nickname/route.ts       # 닉네임 변경
│   ├── admin/
│   │   ├── stats/page.tsx              # 관리자 통계 대시보드
│   │   ├── comments/page.tsx           # 관리자 댓글 관리
│   │   └── reports/page.tsx            # 관리자 신고 관리
│   ├── posts/[slug]/page.tsx           # 글 상세 (TrustBadge, CommentsSection 포함)
│   └── write/page.tsx                  # 글 작성/수정 (관리자 전용)
├── components/
│   ├── auth/AuthProvider.tsx           # 전역 인증 상태 (useAuth 훅)
│   ├── comments/
│   │   ├── CommentsSection.tsx         # 댓글 전체 컨테이너
│   │   ├── QuestionForm.tsx            # 질문 작성 폼 (question_type 선택 포함)
│   │   └── SimilarCases.tsx            # 유사 사례 3단계 fallback 컴포넌트
│   └── posts/TrustBadge.tsx            # 글 신뢰 배지 (AI 도움 여부, 검토일)
└── supabase/
    └── migrations/                     # DB 마이그레이션 파일 (순서대로 적용)
```

---

## 6. 데이터베이스 주요 컬럼

**posts**
```sql
embedding    vector(1536)   -- OpenAI 벡터 (발행 시 비동기 저장)
is_ai_assisted boolean      -- AI 도움 여부 (TrustBadge 표시용)
reviewed_at  timestamp      -- 최종 검토일 (TrustBadge 표시용)
```

**comments**
```sql
question_type  text         -- 사건 유형 (taxonomy 고정값)
topic_tags     text[]       -- 관련 태그 배열
context_answers jsonb       -- 질문 작성 시 구조화된 답변
risk_score     integer      -- PII/법적 위험 자동 점수 (0~100)
status         text         -- pending / public / hidden / law_risk
embedding      vector(1536) -- OpenAI 벡터 (등록 시 비동기 저장)
deleted_at     timestamp    -- 소프트 삭제 (실제 삭제 아님)
```

---

## 7. 환경변수

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # 클라이언트/JWT 검증용
SUPABASE_SERVICE_ROLE_KEY=        # 서버 전용, 절대 클라이언트 노출 금지

# OpenAI (없으면 embedding 기능 비활성화, 나머지 정상 작동)
OPENAI_API_KEY=

# 사이트
NEXT_PUBLIC_SITE_URL=https://lawtiphub.com

# SEO
INDEXNOW_KEY=

# 텔레그램 알림 (선택)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# 광고 (선택)
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
```

---

## 8. DB 마이그레이션 적용 순서

Supabase SQL Editor에서 `supabase/migrations/` 파일을 번호 순서대로 실행:

```
20250514000001_...  기본 스키마
20250514000002_...  댓글 기능
...
20250514000008_pgvector_embeddings.sql   ← pgvector extension + embedding 컬럼 + RPC
20250514000009_question_type_taxonomy.sql ← 질문 유형 고정값
20250514000010_match_comments_by_post.sql ← 1차 유사 사례 RPC
```

> **pgvector 주의:** `20250514000008` 실행 전 Supabase 대시보드에서
> `Database → Extensions → vector` 수동 활성화 필요.

---

## 9. 배포

```bash
git push origin main  # Vercel 자동 배포
```

Vercel 환경변수는 Vercel 대시보드 → Project Settings → Environment Variables에서 설정.

---

## 10. 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 수정 버튼 클릭 시 목록으로 이동 | `GET /api/posts/[slug]?edit=true` 403 | JWT 검증 로직 확인 (`anon.auth.getUser`) |
| 유사 사례 안 뜸 | pgvector 미활성화 or embedding null | Supabase Extensions 확인, 글/질문 재발행 |
| 관리자 페이지 403 | `session.access_token` 미전달 | `useAuth()`에서 `session` 추출 확인 |
| embedding null | OPENAI_API_KEY 누락 | Vercel 환경변수 설정 |
| 2차 검색 오류 | `query_embedding` 타입 불일치 | 배열 그대로 전달 (JSON.stringify 금지) |

---

## 11. 개발 시 주의사항

1. **JWT 토큰 처리:** `authHeader.replace("Bearer ", "")` 결과를 UUID로 직접 비교하면 안 됨. 반드시 `anon.auth.getUser(token)` 후 `user.id` 사용.
2. **SUPABASE_SERVICE_ROLE_KEY:** 서버 API Routes에서만 사용. 클라이언트 컴포넌트에 절대 노출 금지.
3. **embedding 저장:** `JSON.stringify(vec)` 후 저장, RPC 파라미터 전달 시 배열 그대로 전달.
4. **AI 비동기 처리:** embedding 생성은 항상 fire-and-forget. 실패해도 메인 응답에 영향 없음.
5. **댓글 삭제:** 실제 삭제 아닌 `deleted_at` 소프트 삭제. DB에서 직접 삭제 시 유사 사례 데이터 손실됨.
