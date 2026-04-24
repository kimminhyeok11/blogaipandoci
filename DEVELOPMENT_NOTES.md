# 法 BLOG 개발 노트

> AI 개발자를 위한 프로젝트 가이드 - 헷갈리지 않도록 상세히 기록

---

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | 法 BLOG (법 블로그) |
| **기술 스택** | Next.js 14 + TypeScript + Supabase + Tailwind CSS |
| **버전** | 0.1.0 |
| **마지막 업데이트** | 2024년 4월 24일 |

---

## 🏗️ 아키텍처

### 폴더 구조
```
src/
├── app/                    # Next.js App Router
│   ├── (pages)/            # 페이지 라우트
│   │   ├── page.tsx        # 홈 (인기글 + 최신글)
│   │   ├── about/          # 소개 페이지
│   │   ├── categories/     # 카테고리 목록
│   │   ├── login/          # 로그인/회원가입
│   │   ├── posts/          # 글 관련
│   │   │   ├── page.tsx    # 모든 글 목록
│   │   │   └── [slug]/     # 글 상세
│   │   ├── privacy/        # 개인정보처리방침
│   │   ├── profile/        # 사용자 프로필
│   │   ├── search/         # 검색 (실시간)
│   │   ├── tags/           # 태그 목록
│   │   │   └── [tag]/      # 태그별 글
│   │   ├── terms/          # 이용약관
│   │   └── write/          # 글 작성/수정
│   ├── api/                # API 라우트
│   │   ├── auth/           # 인증 API
│   │   ├── posts/          # 글 CRUD API
│   │   └── upload/         # 이미지 업로드 API
│   ├── error.tsx           # 에러 페이지
│   ├── layout.tsx          # 루트 레이아웃
│   ├── loading.tsx         # 로딩 상태
│   ├── not-found.tsx       # 404 페이지
│   ├── robots.ts           # robots.txt
│   ├── rss.xml/            # RSS 피드
│   └── sitemap.ts          # 사이트맵
├── components/             # 컴포넌트
│   ├── ads/                # 광고 컴포넌트
│   ├── editor/             # 에디터
│   │   └── MarkdownEditor.tsx
│   ├── posts/              # 게시글 관련
│   │   ├── PostActions.tsx # 글 액션 (수정/삭제)
│   │   └── ShareButtons.tsx # 공유 버튼
│   └── ui/                 # UI 컴포넌트
│       └── Toast.tsx       # 토스트 알림
├── hooks/                  # 커스텀 훅
│   └── useAuth.ts          # 인증 훅
├── lib/                    # 라이브러리
│   └── supabase.ts         # Supabase 클라이언트
├── types/                  # 타입 정의
│   ├── database.ts         # DB 타입
│   └── index.ts            # 공통 타입
└── utils/                  # 유틸리티
    ├── cn.ts               # 클래스네임 유틸
    └── image.ts            # 이미지 처리
```

---

## 🔧 주요 기술 결정사항

### 1. marked 라이브러리 (v12+)
```typescript
// ✅ 올바른 사용법 - marked.use()
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    link(token) { return `...` },
    image(token) { return `...` },
    // ... 기타 렌더러
  }
});

// ❌ 잘못된 사용법 (구버전)
marked.setOptions({ gfm: true });
const renderer = new marked.Renderer();
```

### 2. Supabase 타입 처리
```typescript
// 타입 에러 발생 시 any 캐스팅 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data } = await (supabase as any)
  .from("posts")
  .select("...")
```

### 3. Toast 알림 시스템
- **위치**: `layout.tsx`에 `ToastProvider`로 전역 제공
- **사용법**:
```typescript
import { useToast } from "@/components/ui/Toast";
const { showToast } = useToast();
showToast("메시지", "success" | "error" | "warning" | "info");
```

### 4. React.memo 적용 컴포넌트
- `PostActions` - props 변경 시에만 리렌더링
- `ShareButtons` - props 변경 시에만 리렌더링

---

## 📦 주요 의존성

```json
{
  "@supabase/auth-helpers-nextjs": "^0.15.0",
  "@supabase/supabase-js": "^2.104.1",
  "browser-image-compression": "^2.0.2",
  "marked": "^18.0.2",
  "next": "14.2.35",
  "lucide-react": "^1.9.0"
}
```

**제거된 미사용 패키지**:
- `react-markdown`
- `next-mdx-remote`
- `rehype-highlight`
- `rehype-raw`
- `remark-gfm`
- `remark-toc`
- `sharp`

---

## 🎨 디자인 시스템

### 색상 팔레트
```css
--paper: #f5f0e8;    /* 배경색 */
--ink: #2a2420;      /* 기본 텍스트 */
--rust: #8b4513;     /* 강조색 */
--rule: #d4c8b8;     /* 테두리 */
--cream: #faf8f5;    /* 카드 배경 */
--muted: #8b8680;    /* 보조 텍스트 */
```

### 타이포그래피
- **본문**: `font-serif` (Georgia, Times New Roman)
- **UI**: `font-sans` (Inter, system-ui)

---

## 🔐 인증/인가

### 현재 사용자 확인
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### 작성자 본인 확인 패턴
```typescript
// 글 수정/삭제 전 권한 체크
if (post.user_id !== user?.id) {
  showToast("수정 권한이 없습니다.", "error");
  return;
}
```

---

## 🗄️ 데이터베이스 스키마

### posts 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | 작성자 FK |
| title | text | 제목 |
| slug | text | URL용 고유 식별자 |
| content | text | 마크다운 내용 |
| excerpt | text | 요약 |
| category | text | 카테고리 |
| tags | text | 쉼표 구분 태그 |
| published | boolean | 발행 여부 |
| published_at | timestamp | 발행일 |
| view_count | integer | 조회수 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |
| cover_image | text | 커버 이미지 URL |

### users 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK (auth.users 참조) |
| nickname | text | 닉네임 |
| avatar_url | text | 프로필 이미지 |

---

## 🔄 페이지별 데이터 페칭 패턴

### 홈 (`/`)
```typescript
// 인기글 (조회수 기준)
const { data: popularPosts } = await supabase
  .from("posts")
  .select("...")
  .eq("published", true)
  .not("published_at", "is", null)  // 중요!
  .order("view_count", { ascending: false })
  .limit(1);

// 최신글
const { data: latestPosts } = await supabase
  .from("posts")
  .select("...")
  .eq("published", true)
  .not("published_at", "is", null)
  .order("published_at", { ascending: false })
  .limit(5);
```

### 글 상세 (`/posts/[slug]`)
```typescript
// 서버 컴포넌트에서 직접 조회
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("slug", slug)
  .single();
```

---

## 🚀 배포 설정

### next.config.mjs
```javascript
const nextConfig = {
  images: {
    unoptimized: false,        // 이미지 최적화 활성화
    formats: ['image/webp', 'image/avif'],
  },
  trailingSlash: true,         // URL 끝에 /
  generateEtags: true,
  compress: true,
  poweredByHeader: false,      // X-Powered-By 헤더 제거
};
```

### 환경변수 (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

---

## ⚠️ 주의사항 & 함정

### 1. `published_at` null 체크 필수
- 임시저장 글은 `published=true`이지만 `published_at=null`일 수 있음
- 정렬 시 반드시 `.not("published_at", "is", null)` 추가

### 2. Server Component vs Client Component
- **Server Component**: `window`, `document` 사용 불가
- **Client Component**: `"use client"` 선언 필요
- 공유 버튼, Toast 등 클라이언트 기능은 Client Component로 분리

### 3. useEffect 의존성 배열
- `showToast` 등 함수는 의존성에서 제외 또는 `useCallback` 사용
- Supabase 쿼리는 의존성 배열에 포함

### 4. slug 중복 방지
```typescript
// 타임스탬프 추가로 고유 slug 생성
const baseSlug = generateSlug(title);
const timestamp = Date.now().toString(36).slice(-6);
const slug = `${baseSlug}-${timestamp}`;
```

---

## 📝 향후 업데이트 예정

### 우선순위: 높음
- [ ] 댓글 시스템 구현
- [ ] 대시보드 통계 페이지
- [ ] 이미지 갤러지 뷰

### 우선순위: 중간
- [ ] 다크모드 지원
- [ ] PWA 오프라인 지원
- [ ] 뉴스레터 구독

### 우선순위: 낮음
- [ ] 관리자 패널
- [ ] 다국어 지원
- [ ] AI 요약 기능

---

## 👤 사용자 시나리오 및 예외처리

### 1. 인증 플로우
| 시나리오 | 처리 | 파일 |
|----------|------|------|
| 로그인 | 이메일 형식 검증, 비밀번호 6자 이상 | `login/page.tsx` |
| 회원가입 | 동일 검증 + 이메일 확인 메일 발송 | `login/page.tsx` |
| 비밀번호 재설정 | `/auth/reset-password` 페이지에서 처리 | `auth/reset-password/page.tsx` |
| 미로그인 사용자 | Toast 메시지 후 로그인 페이지로 리다이렉트 | `write/page.tsx` |

### 2. 글 작성/수정 플로우
| 시나리오 | 검증 | 처리 |
|----------|------|------|
| 제목 입력 | 최소 2자 이상 | Toast warning |
| 내용 입력 | 최소 10자 이상 | Toast warning |
| 임시저장 | published=false, published_at=null | 메인에 표시 안 됨 |
| 발행 | published=true, published_at=현재시간 | 메인에 표시됨 |
| 수정 권한 | 작성자 본인만 수정 가능 | 권한 없으면 리다이렉트 |
| 이미지 업로드 | 1MB 이하, WebP 변환 | 실패 시 무시 (UX 개선) |

### 3. 글 조회 플로우
| 시나리오 | 처리 | 파일 |
|----------|------|------|
| 목록 조회 | published=true + published_at!=null | `page.tsx`, `posts/page.tsx` |
| 상세 조회 | published=true만 (비공개 글은 작성자만) | `posts/[slug]/page.tsx` |
| 존재하지 않는 글 | 404 notFound() | `posts/[slug]/page.tsx` |
| 삭제 | confirm()으로 확인, 성공 시 목록으로 | `PostActions.tsx` |

### 4. 입력값 검증 패턴
```typescript
// 이메일 검증
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 제목/내용 길이 검증
if (title.trim().length < 2) {
  showToast("제목은 최소 2자 이상이어야 합니다.", "warning");
  return;
}

// 비밀번호 검증 (회원가입 시)
if (password.length < 6) {
  showToast("비밀번호는 최소 6자 이상이어야 합니다.", "warning");
  return;
}
```

### 5. 에러 처리 패턴
```typescript
// 1. 사용자에게 피드백 (Toast)
try {
  await saveData();
  showToast("저장되었습니다.", "success");
} catch {
  showToast("저장에 실패했습니다.", "error");
}

// 2. 조용히 처리 (console 제거)
try {
  await fetchData();
} catch {
  // 에러 처리
}

// 3. 리다이렉트
if (!user) {
  showToast("로그인이 필요합니다.", "error");
  router.push("/login");
  return;
}
```

## 🧹 클린 코드 표준

### 금지 항목 (Production Code)
```typescript
// ❌ 금지 - alert 사용
alert("메시지");

// ❌ 금지 - console.log/error
console.log("디버그");
console.error("에러");

// ✅ 대안 - Toast 사용
import { useToast } from "@/components/ui/Toast";
const { showToast } = useToast();
showToast("메시지", "success" | "error" | "warning" | "info");
```

### 허용 예외
```typescript
// ✅ 허용 - confirm (파괴적 작업 확인)
if (!confirm("정말 삭제하시겠습니까?")) return;

// ✅ 허용 - error.tsx의 console.error
// (Next.js 에러 바운더리용)
```

---

## 🐛 알려진 이슈

| 이슈 | 상태 | 해결 방안 |
|------|------|----------|
| Supabase 타입 에러 | ⚠️ 감수 | `as any` 캐스팅 사용 |
| img 태그 경고 | ⚠️ 무시 | Next Image 마이그레이션 예정 |
| console.log | ✅ 완료 | 모두 제거됨 |
| alert | ✅ 완료 | Toast로 교체 완료 |

---

## 📞 연락처

- **프로젝트**: 法 BLOG
- **배포**: https://blogaipandoci.vercel.app
- **GitHub**: (private repository)

---

*이 문서는 AI 개발자가 프로젝트를 이어서 작업할 때 참고용으로 작성되었습니다.*
