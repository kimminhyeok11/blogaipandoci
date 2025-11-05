# 배포/레포 구성 안내

이 문서는 `c:\Users\salad\Desktop\7878` 폴더 전체를 그대로 GitHub에 푸시(업로드)하고, Vercel로 배포할 때의 설정과 확인 항목을 정리합니다.

## 폴더 구조와 배포 대상
- 레포 루트를 그대로 푸시하면 됩니다.
- 정적 산출물은 `dist/` 폴더에 동기화되어 있어, 프로젝트 루트를 `dist`로 지정해도 되고, 루트 배포를 사용해도 됩니다.
- 루트/`dist` 각각에 `vercel.json`이 있어 SPA 라우팅과 캐시 헤더가 설정되어 있습니다.

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
- `og-image.svg`는 루트와 `dist/` 모두에 포함되어 있습니다.

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

## 배포 루트 선택과 서버리스 주의사항
- 이 레포는 두 가지 배포 루트를 지원합니다:
  - 레포 루트를 프로젝트 루트로 사용
  - `dist/`를 프로젝트 루트로 사용
- 서버리스 함수(RSS/사이트맵) 사용을 위해 두 위치 모두에 구성이 포함되어 있습니다:
  - `api/`는 레포 루트에 있고, 동일한 핸들러가 `dist/api/`에도 복제되어 있습니다.
  - 패키지 의존성은 루트 `package.json`과 `dist/package.json` 모두에 `@supabase/supabase-js`가 선언되어 있습니다.
- 따라서 Vercel에서 프로젝트 루트를 루트 또는 `dist/`로 지정해도 서버리스가 정상 동작합니다.