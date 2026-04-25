# BLOG Platform - Logic Documentation

## Status: ✅ 정상 작동 확인 (2025-04-25 최신 업데이트)

### ✅ 구현 완료 기능
- 메인 페이지 (인기글/최신글 표시)
- 글 목록 페이지
- 글 상세 페이지
- 검색 기능
- 태그별 필터링
- 로그인/로그아웃
- 마이페이지 (프로필 조회)

---

## 1. 데이터베이스 스키마

### 1.1 posts 테이블
```sql
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  cover_image_alt TEXT,
  published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);
```

### 1.2 태그 테이블
```sql
-- tags 테이블: 태그 정보 저장
CREATE TABLE public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- post_tags 테이블: 게시글-태그 관계
CREATE TABLE public.post_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, tag_id)
);
```

---

## 2. 게시글 조회 로직

### 2.1 최신글 조회 (메인 페이지)
**파일**: `src/app/page.tsx`

```typescript
// 인기글 (featured + 최근 30일 조회수 높은 글)
const { data: popularData } = await supabase
  .from("posts")
  .select("*, user:users(nickname)")
  .eq("published", true)
  .not("published_at", "is", null)  // ✅ 올바른 null 비교 문법
  .eq("featured", true)
  .gte("published_at", thirtyDaysAgo)
  .order("view_count", { ascending: false })
  .limit(5);

// 최신글 (최근 발행된 글)
const { data: latestData } = await supabase
  .from("posts")
  .select("*, user:users(nickname)")
  .eq("published", true)
  .not("published_at", "is", null)  // ✅ 올바른 null 비교 문법
  .order("published_at", { ascending: false })
  .limit(6);
```

### 2.2 게시글 상세 조회
**파일**: `src/app/posts/[slug]/page.tsx`

```typescript
const { data, error } = await supabase
  .from("posts")
  .select("*, user:users(nickname, avatar_url)")  // ✅ users.is_deleted 제거
  .eq("slug", slug)
  .eq("published", true)
  .single();
```

**주의**: `users` 테이블에 `is_deleted` 컬럼이 없으므로 필터링하지 않음

**조건**:
- `published = true` (발행 상태)
- `published_at IS NOT NULL` (발행일 존재)
- `user:users(nickname)` 조인으로 작성자 정보 포함

### 2.2 모든 글 목록 조회
**파일**: `src/app/posts/page.tsx`

```typescript
const { data } = await supabase
  .from("posts")
  .select("*, user:users(nickname)")
  .eq("published", true)
  .not("published_at", "is", null)  // ✅ 올바른 null 비교 문법
  .order("published_at", { ascending: false });
```

### 2.3 검색 기능
**파일**: `src/app/search/page.tsx`

```typescript
const { data } = await supabase
  .from("posts")
  .select("id, title, excerpt, slug, published_at, view_count")
  .eq("published", true)
  .not("published_at", "is", null)  // ✅ 올바른 null 비교 문법
  .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
  .order("published_at", { ascending: false })
  .limit(20);
```

### 2.4 태그별 글 조회
**파일**: `src/app/tags/[tag]/page.tsx`

```typescript
// 1. 태그 정보 조회
const { data: tagData } = await supabase
  .from("tags")
  .select("id")
  .eq("slug", tagSlug)
  .single();

// 2. post_tags에서 post_id 목록 조회
const { data: postTags } = await supabase
  .from("post_tags")
  .select("post_id")
  .eq("tag_id", tagData.id);

// 3. posts 테이블에서 게시글 정보 조회
const { data } = await supabase
  .from("posts")
  .select("id, title, excerpt, slug, published_at, view_count")
  .eq("published", true)
  .not("published_at", "is", null)  // ✅ 올바른 null 비교 문법
  .in("id", postIds)
  .order("published_at", { ascending: false });
```

---

## 3. 중요한 수정 사항

### 3.1 Supabase null 비교 문법
**문제**: `.neq("published_at", null)` 사용 시 `"invalid input syntax for type timestamp with time zone: "null""` 에러 발생

**해결**: `.not("published_at", "is", null)` 로 수정

**적용 파일**:
- `src/app/page.tsx`
- `src/app/posts/page.tsx`
- `src/app/search/page.tsx`
- `src/app/tags/[tag]/page.tsx`
- `src/app/api/posts/route.ts`
- `src/app/sitemap.ts`
- `src/app/rss.xml/route.ts`

### 3.2 SQL 스키마와 일치하도록 수정
- `posts` 테이블에 `category` 컬럼 없음 → 관련 코드 제거
- `posts` 테이블에 `tags` 컬럼 없음 → `tags` + `post_tags` 테이블로 분리 구현
- `users` 테이블에 `is_deleted` 컬럼 없음 → `profile/page.tsx`, `posts/[slug]/page.tsx`에서 필터링 제거

### 3.3 네비게이션 로직
**파일**: `src/app/page.tsx` (헤더 네비게이션)

```typescript
const { user } = useAuth();  // 로그인 상태 확인

// 유저 아이콘 링크: 로그인 상태에 따라 분기
<Link
  href={user ? "/profile" : "/login"}
  aria-label={user ? "마이페이지" : "로그인"}
>
  <User size={18} />
</Link>
```

**동작**:
- 로그인 상태 → `/profile` (마이페이지)
- 미로그인 상태 → `/login` (로그인 페이지)

---

## 4. 출력 확인 사항

### 4.1 메인 페이지 (`/`)
- ✅ 인기글 섹션: `featured=true` + 최근 30일 + 조회수 높은 순 5개
- ✅ 최신글 섹션: 발행일 기준 최신 6개

### 4.2 글 목록 페이지 (`/posts`)
- ✅ 모든 발행된 글 목록 (발행일 내림차순)

### 4.3 검색 페이지 (`/search`)
- ✅ 제목/요약/내용 검색 결과 표시

### 4.4 태그 페이지 (`/tags/[tag]`)
- ✅ 특정 태그가 붙은 글 목록 표시

### 4.5 글 상세 페이지 (`/posts/[slug]`)
- ✅ 마크다운 콘텐츠 렌더링
- ✅ 작성자 정보 표시
- ✅ 조회수 표시
- ✅ 공유 버튼

### 4.6 마이페이지 (`/profile`)
- ✅ 로그인 상태 확인 후 프로필 표시
- ✅ 미로그인 시 로그인 페이지로 리다이렉트
- ✅ 로그아웃 기능

---

## 5. 인증 및 세션

### 5.1 AuthProvider
- **파일**: `src/components/auth/AuthProvider.tsx`
- **기능**: `onAuthStateChange`로 세션 변경 감지, 전역 상태 관리

### 5.2 세션 지속
- `persistSession: true` 설정
- 로그인 상태 유지 확인됨

### 5.3 마이페이지 (Profile)
**파일**: `src/app/profile/page.tsx`

```typescript
// 로그인 확인
const { data: { user: authUser } } = await supabase.auth.getUser();
if (!authUser) {
  router.push("/login");
  return;
}

// 사용자 프로필 정보 조회
const { data: profile } = await db.users()
  .select("nickname, avatar_url")
  .eq("id", authUser.id)
  .single();
```

**기능**:
- 로그인 상태 확인 (미로그인 시 로그인 페이지로 리다이렉트)
- 사용자 프로필 정보 표시 (이메일, 닉네임, 가입일)
- 로그아웃 기능

**접근 경로**: `/profile`

### 5.4 글 작성/수정 (Write)
**파일**: `src/app/write/page.tsx`

#### 신규 작성
```typescript
const { data: newPost, error } = await db.posts().insert({
  user_id: currentUser.id,
  title: title.trim(),
  slug: `${baseSlug}-${timestamp}`,
  content: content.trim(),
  excerpt: finalExcerpt,
  published,
  published_at: published ? new Date().toISOString() : null,
}).select("id").single();

// 태그 저장
await saveTags(newPost.id, tagList);
```

#### 글 수정
```typescript
const { error } = await db.posts().update({
  title: title.trim(),
  content: content.trim(),
  excerpt: finalExcerpt,
  published,
  published_at: published ? new Date().toISOString() : null,
  updated_at: new Date().toISOString(),
}).eq("id", postId);

// 기존 태그 삭제 후 새 태그 저장
await db.post_tags().delete().eq("post_id", postId);
await saveTags(postId, tagList);
```

**주의사항**:
- 수정 시 `useAuth()` 대신 직접 `supabase.auth.getUser()` 호출 (세션 신뢰성)
- 작성자 본인 확인: 로드 시 `user.id !== post.user_id` 체크
- RLS 정책: `Authors can update own posts`

---

## 6. 에러 핸들링

### 6.1 Toast 알림
- **파일**: `src/components/ui/Toast.tsx`
- **사용**: `useToast()` 훅으로 에러/성공 메시지 표시

### 6.2 에러 로그
- 브라우저 콘솔에서 `[DEBUG]` 로그 확인 가능
- `[ERROR]` 접두사로 에러 구분

---

## 7. 테스트 확인 방법

```bash
# 로컬 서버 실행
npm run dev

# 브라우저에서 확인
http://localhost:3000

# 콘솔 로그 확인 (F12)
[DEBUG] fetchPosts start
[DEBUG] Popular posts result: { count: X }
[DEBUG] Latest posts result: { count: X }
```

---

## 8. 배포

### 8.1 GitHub 푸시
```bash
git add .
git commit -m "fix: null comparison syntax and schema alignment"
git push origin main
```

### 8.2 Vercel/Netlify 자동 배포
- GitHub 연동 시 자동 배포
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

**작성일**: 2025-04-25 (최종 업데이트)
**상태**: ✅ 모든 기능 정상 작동 확인 완료
**주요 수정**:
- Supabase null 비교 문법 수정 (`.neq()` → `.not("is", null)`)
- `users.is_deleted` 컬럼 참조 제거 (스키마 불일치 수정)
- 네비게이션 로그인/로그아웃 상태 분기 처리
- 마이페이지 구현 완료
