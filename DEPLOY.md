# 배포/레포 구성 안내 (루트 단일화)

이 문서는 `c:\Users\salad\Desktop\7878` 레포를 Vercel로 배포할 때의 설정과 확인 항목을 정리합니다. 중복을 줄이기 위해 배포 루트를 레포 루트(`/`)로 단일화했습니다.

## 폴더 구조와 배포 대상
- 레포 루트를 그대로 푸시하고, Vercel에서 `Root Directory`를 `/`로 설정하세요.
- SPA 라우팅과 캐시 헤더는 루트의 `vercel.json` 하나만 사용합니다.

## SPA 라우팅 (리라이트)
다음 경로는 모두 `index.html`로 폴백됩니다.
- `/post/...`
- `/writer...`
- `/dashboard...`
- `/about...`
- `/tags...`
- `/categories...`
- `/search...`
- `/archives...`

## 메타 태그와 OG 이미지
- `canonical`: `https://blogaipandoci.vercel.app`
- `og:image` / `twitter:image`: `https://blogaipandoci.vercel.app/og-image.svg`

## 캐시 정책
- `css/`, `js/`, 이미지(`svg/png/jpg/jpeg/webp/avif`)에 `immutable` 캐시 헤더가 설정되어 있습니다.
- 자산 변경 시 파일명 버전업을 권장합니다.

## 주의사항 (보안/호환)
- 민감키는 프론트엔드 레포에 포함하지 마세요. 모든 키는 환경변수(Vercel 프로젝트 설정)로 관리하세요.
- 일부 SNS는 `svg` OG 이미지를 미리보기로 처리하지 않을 수 있습니다. 필요 시 `og-image.png`(권장 1200×630)를 추가하고 메타를 `png`로 교체하세요.

## 배포 체크리스트
- `https://blogaipandoci.vercel.app/og-image.svg`가 200으로 응답하는지 확인
- `/post/슬러그` `/writer/...` `/dashboard` `/about` `/tags` 경로 새로고침 시 404 없이 로드되는지 확인
- SNS 공유(카카오톡/페북/Twitter)에서 미리보기 이미지가 노출되는지 확인

## RSS/사이트맵 자동 최신화
- 서버리스 함수가 Supabase에서 최신 글을 조회해 RSS/사이트맵을 즉시 생성합니다.
- 환경변수 설정 (Vercel 프로젝트 → Settings → Environment Variables):
  - `SUPABASE_URL`: Supabase 프로젝트 URL
  - `SUPABASE_ANON_KEY`: Supabase anon 공개 키
  - `SITE_URL`: 사이트 기본 URL (예: `https://blogaipandoci.vercel.app`)
- 적용 경로:
  - `GET /feed.xml` (또는 `/rss.xml`): RSS 2.0
  - `GET /sitemap.xml`: Sitemap XML

## 라우팅 확장 (추가)
- `/archives`: 월별 아카이브 클라이언트 라우트