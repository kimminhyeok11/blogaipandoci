# 법 BLOG - 저널리즘 블로그 플랫폼

깊이 있는 분석과 인사이트를 담은 블로그 플랫폼입니다. Next.js 14 + Supabase + Tailwind CSS로 구축되었습니다.

## 빠른 시작

### 1. 환경 변수 설정
`.env` 파일에 다음을 추가:
```
NEXT_PUBLIC_SUPABASE_URL=https://mcgrkxsgifcvfubsnzur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Supabase 설정
Supabase SQL 에디터에서 `supabase/migrations/001_init.sql` 파일의 내용을 실행하세요.

### 3. Storage 버킷 생성
1. Supabase Dashboard → Storage
2. `images` 버킷 생성 (Public 설정)
3. 업로드 제한: 1MB, 이미지 파일만

### 4. 개발 서버 실행
```bash
npm install
npm run dev
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 메인 페이지
│   ├── write/page.tsx     # 글쓰기 페이지
│   ├── login/page.tsx     # 인증 페이지
│   ├── posts/page.tsx     # 게시글 목록
│   └── posts/[slug]/      # 게시글 상세
├── components/
│   └── editor/            # 마크다운 에디터
├── lib/supabase.ts        # Supabase 클라이언트
├── hooks/useAuth.ts       # 인증 훅
├── types/                 # TypeScript 타입
└── utils/                 # 유틸리티 함수
```

## 주요 기능

- **마크다운 에디터**: 모바일 최적화된 리치 에디터
- **이미지 업로드**: 자동 WebP 변환, 1MB 제한
- **SEO 최적화**: Open Graph, 메타 태그, 사이트맵
- **반응형 디자인**: 모바일/태블릿/PC 지원
- **인증 시스템**: 이메일/비밀번호 기반 (Supabase Auth)

## 보안

- RLS (Row Level Security) 정책 적용
- 사용자 인증 기반 데이터 접근 제어
- 파일 업로드 MIME 타입 검증

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Editor**: Custom Markdown Editor
- **Deployment**: Vercel / Netlify

## 배포 가이드

### Vercel 배포
1. GitHub 저장소에 push
2. Vercel에서 프로젝트 import
3. 환경 변수 설정
4. Deploy

### 환경 변수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

## 라이선스

MIT License
