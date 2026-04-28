# 法 BLOG

> 깊이 있는 분석과 인사이트를 제공하는 저널리즘 스타일 블로그 플랫폼

## 🚀 데모

**사이트**: https://blogaipandoci.vercel.app

## ✨ 주요 기능

### 📝 콘텐츠
- 마크다운 에디터 (단축키 지원)
- 자동 목차 생성 (TOC)
- 이미지 드래그앤드롭 업로드
- 실시간 미리보기

### 🔍 검색 & SEO
- 실시간 전문 검색
- **IndexNow 자동 알림** - 글 발행 시 검색엔진에 실시간 통지
- 구조화 데이터 (JSON-LD)
- 사이트맵 자동 생성
- 메타 태그 최적화

### 📱 사용자 경험
- **스마트 스티키 네비게이션** - 스크롤 방향에 따라 자동 숨김/표시
- **관련 글 추천** - 본문 하단에 태그 기반 추천 글 표시
- 반응형 디자인 (모바일 최적화)
- 다크/라이트 모드

### 🔗 공유
- 소셜 공유 (트위터, 페이스북, 카카오톡, 네이버, 라인, 카카오스토리)
- **모바일 앱 직접 연결** - iOS/Android 앱으로 바로 공유
- 링크 복사

### 🔐 인증 & 관리
- Supabase 기반 인증
- 글쓰기/수정/삭제
- 태그 관리
- 조회수 집계

## 🛠️ 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **Markdown**: marked v18
- **Deployment**: Vercel

## 📦 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
INDEXNOW_KEY=your_key

# 개발 서버 실행
npm run dev
```

## ⚙️ 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# IndexNow (검색엔진 알림)
INDEXNOW_KEY=
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 📝 개발 노트

[DEVELOPMENT_NOTES.md](./DEVELOPMENT_NOTES.md) 참조

## 📄 라이선스

MIT License  2024
