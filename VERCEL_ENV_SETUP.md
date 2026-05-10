# Vercel 환경변수 변경 방법

## 1. Vercel Dashboard 접속
https://vercel.com/dashboard

## 2. 프로젝트 선택
- blog-platform 또는 해당 프로젝트 클릭

## 3. Settings → Environment Variables
- 왼쪽 메뉴에서 **Settings** → **Environment Variables**

## 4. 기존 변수 수정
찾기: `NEXT_PUBLIC_SITE_URL`
- 현재값: `https://blogaipandoci.vercel.app`
- **새 값**: `https://lawtiphub.com`
- **Save** 클릭

## 5. Production 재배포
변경 후 자동으로 재배포됨 (또는 수동 Deploy)

## 6. 캐시 무효화 (즉시 반영을 위해)
sitemap.xml은 1시간 캐시됨
- 브라우저 캐시 클리어
- 또는 `?nocache=1` 붙여서 테스트
