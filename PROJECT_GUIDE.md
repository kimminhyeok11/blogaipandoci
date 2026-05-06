# 프로젝트 가이드 - Blog AI Platform

> **최종 업데이트:** 2026년 5월 6일

---

## 1. 프로젝트 개요

**블로그 플랫폼 with AI 기능**
- Next.js 14 App Router 기반
- Supabase (PostgreSQL + Storage + Auth)
- Tailwind CSS + shadcn/ui 스타일링
- 관리자 대시보드 통계 및 이미지 관리

---

## 2. 핵심 기능

### 2.1 인증 및 권한
| 기능 | 설명 |
|------|------|
| **로그인/회원가입** | Supabase Auth (이메일/비밀번호) |
| **관리자 권한** | `users.role` 컬럼으로 관리 (`admin` / `user`) |
| **RLS 정책** | Row Level Security로 데이터 보호 |

### 2.2 글 관리
| 기능 | 설명 |
|------|------|
| **마크다운 에디터** | 실시간 미리보기 + 이미지 업로드 |
| **임시저장** | localStorage 자동 저장 (30초 간격) |
| **히스토리** | 수정 이력 저장 및 복원 |
| **태그** | 게시글 태그 기능 |

### 2.3 이미지 처리
| 기능 | 설명 |
|------|------|
| **WebP 변환** | `browser-image-compression` 라이브러리 |
| **alt/caption/link** | 이미지 업로드 후 모달에서 설정 |
| **고아 이미지 관리** | 사용되지 않는 이미지 대시보드에서 조회/삭제 |

### 2.4 관리자 기능
| 기능 | 설명 |
|------|------|
| **통계 대시보드** | 총 게시글, 조회수, 인기글, 일별 추이 |
| **이미지 저장소 관리** | 고아 이미지 시각화 + 선택 삭제 |

---

## 3. 아키텍처

### 3.1 기술 스택
```
Frontend:     Next.js 14 (App Router) + React + TypeScript
Styling:      Tailwind CSS + shadcn/ui
Backend:      Next.js API Routes
Database:     Supabase (PostgreSQL)
Storage:      Supabase Storage
Auth:         Supabase Auth
Deployment:   Vercel
```

### 3.2 폴더 구조
```
src/
├── app/                    # Next.js App Router
│   ├── (routes)/          # 페이지 라우트
│   ├── api/               # API 엔드포인트
│   ├── admin/stats/       # 관리자 대시보드
│   ├── posts/[slug]/      # 글 상세
│   ├── write/             # 글쓰기
│   └── layout.tsx         # 루트 레이아웃
├── components/
│   ├── auth/              # 인증 관련
│   ├── editor/            # 마크다운 에디터
│   ├── posts/             # 게시글 컴포넌트
│   └── ui/                # UI 컴포넌트
├── lib/
│   └── supabase.ts        # Supabase 클라이언트
├── types/
│   └── database.ts        # 타입 정의
└── styles/
    └── globals.css        # 전역 스타일
```

### 3.3 API 인증 방식
**모든 API는 Authorization 헤더 사용:**
```typescript
headers: {
  'Authorization': `Bearer ${user.id}`
}
```

**수정된 API 목록:**
- `/api/stats` (GET/POST)
- `/api/revisions` (GET/POST/DELETE)
- `/api/upload` (POST)
- `/api/admin/images` (GET/DELETE)
- `/api/posts/[slug]` (GET)

---

## 4. 데이터베이스 스키마

### 4.1 테이블 목록

**posts** - 게시글
```sql
id: uuid (PK)
title: text
slug: text (unique)
content: text
excerpt: text
cover_image: text
cover_image_alt: text
published: boolean
featured: boolean
view_count: integer (default 0)
user_id: uuid (FK → users.id)
created_at: timestamp
updated_at: timestamp
```

**users** - 사용자 (Supabase Auth 확장)
```sql
id: uuid (PK, Supabase Auth 연동)
email: text
role: text (default 'user', 'admin' 가능)
created_at: timestamp
```

**post_revisions** - 수정 히스토리
```sql
id: uuid (PK)
post_id: uuid (FK → posts.id)
title: text
content: text
excerpt: text
revision_number: integer
created_by: uuid (FK → users.id)
created_at: timestamp
```

**tags** - 태그
```sql
id: uuid (PK)
name: text (unique)
slug: text (unique)
created_at: timestamp
```

**post_tags** - 게시글-태그 연결
```sql
post_id: uuid (FK)
tag_id: uuid (FK)
```

### 4.2 RLS 정책

**posts 테이블:**
- SELECT: 인증된 사용자는 자신의 글, 익명 사용자는 published=true 글
- INSERT/UPDATE/DELETE: 작성자 본인 또는 관리자

**users 테이블:**
- SELECT: 모든 사용자 (익명 포함)
- UPDATE: 본인만

**post_revisions 테이블:**
- SELECT: 글 작성자 또는 관리자
- INSERT/DELETE: 작성자 또는 관리자

---

## 5. 환경변수

### 5.1 필수 환경변수 (Vercel)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# (Optional) AdSense
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxx
```

### 5.2 로컬 개발 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. 주요 기능 상세

### 6.1 이미지 업로드 흐름
```
1. 사용자가 이미지 선택
2. browser-image-compression으로 WebP 변환 (max 1MB, 1920px)
3. /api/upload로 업로드 (Authorization 헤더 포함)
4. Supabase Storage uploads/ 폴더에 저장
5. 모달에서 alt, caption, link 설정
6. 마크다운 형태로 에디터에 삽입
```

### 6.2 고아 이미지 관리
```
1. /api/admin/images 조회
2. 모든 게시글 content 파싱 → 사용 중인 이미지 URL 추출
3. Storage uploads/ 목록 조회
4. 차집합 계산 → 고아 이미지 목록
5. 대시보드에서 그리드로 표시
6. 선택 삭제 시 Storage에서 제거
```

### 6.3 관리자 권한 체크
```
1. 클라이언트: user.role === 'admin' 체크
2. 서버 API: Authorization 헤더에서 userId 추출
3. users 테이블에서 role 조회
4. 관리자가 아니면 403 반환
```

---

## 7. 배포 및 운영

### 7.1 Vercel 배포
```bash
# GitHub 연동 자동 배포
git push origin main  # 자동 배포됨
```

### 7.2 수동 DB 마이그레이션
```sql
-- Supabase SQL Editor에서 실행
-- migrations/ 폴더의 SQL 파일들 순서대로
```

### 7.3 이미지 정리 주기
- **권장:** 월 1회 `/admin/stats`에서 고아 이미지 확인 및 삭제
- **Storage 비용 절약:** 불필요한 이미지 정기 삭제

---

## 8. 문제 해결

### 8.1 자주 발생하는 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| **401 Unauthorized** | API에서 쿠키 기반 인증 실패 | Authorization 헤더로 user.id 전달 |
| **403 Forbidden** | 관리자 권한 없음 | users.role = 'admin' 설정 확인 |
| **글 목록 안 뜸** | RLS 정책 문제 | 익명 SELECT 권한 확인 |
| **이미지 업로드 실패** | Storage 정책 또는 인증 | service role key 확인 |

### 8.2 디버깅
```bash
# 로컬 개발 서버
npm run dev

# 빌드 테스트
npm run build
```

---

## 9. 향후 개선 아이디어

- [ ] AI 글쓰기 보조 기능
- [ ] SEO 최적화 자동화
- [ ] 댓글 시스템
- [ ] 구독/알림 기능
- [ ] 다국어 지원

---

## 10. 참고 자료

- **Next.js 14:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com

---

**작성:** Blog AI Platform 개발팀  
**라이선스:** MIT
