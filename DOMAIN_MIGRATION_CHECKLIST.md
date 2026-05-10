# lawtiphub.com 도메인 전환 체크리스트

## ✅ 완료됨 (자동)
- [x] 코드 내 도메인 참조 변경
- [x] sitemap/robots/rss 업데이트
- [x] Git 배포

## 🔴 당신이 해야 할 일

### 1. Vercel Dashboard 설정
**https://vercel.com/dashboard**
- [ ] 프로젝트 선택 → Settings → Domains
- [ ] `lawtiphub.com` 추가
- [ ] DNS 레코드 확인 (A 레코드: 76.76.21.21)
- [ ] SSL 인증서 발급 확인

### 2. 기존 도메인 301 리다이렉트 설정
- [ ] `blogaipandoci.vercel.app` → `lawtiphub.com` 301 리다이렉트 설정

### 3. 검색엔진 재등록 (필수!)

#### 구글 서치콘솔
- [ ] https://search.google.com/search-console
- [ ] `lawtiphub.com` 속성 추가
- [ ] sitemap 재제출: `https://lawtiphub.com/sitemap.xml`
- [ ] 변경된 URL 수동 요청

#### 네이버 서치어드바이저
- [ ] https://searchadvisor.naver.com
- [ ] `lawtiphub.com` 사이트 등록
- [ ] 소유권 확인 (HTML 파일 또는 메타태그)
- [ ] 사이트맵 제출

#### 빙 웹마스터
- [ ] https://www.bing.com/webmasters
- [ ] `lawtiphub.com` 추가
- [ ] 기존 URL 제거 요청
- [ ] 새 sitemap 제출

### 4. Supabase 설정 변경
- [ ] Authentication → URL 설정 변경
- [ ] Storage → CORS 설정 확인

### 5. AdSense 설정
- [ ] https://www.google.com/adsense
- [ ] 사이트 주소 변경: `lawtiphub.com`
- [ ] ads.txt 확인/업데이트

### 6. IndexNow 키 파일 확인
- [ ] `lawtiphub.com/d69e5cf2d78353c1c09c08c163ae690b.txt` 접속 확인

### 7. 외부 서비스 업데이트
- [ ] Google Analytics 속성 업데이트
- [ ] 소셜 미디어 프로필 링크 변경
- [ ] 기존 공유 링크 업데이트 (선택)

### 8. 테스트
- [ ] https://lawtiphub.com 접속 확인
- [ ] 개별 게시글 URL 확인
- [ ] sitemap.xml 접속 확인
- [ ] robots.txt 접속 확인

---

## ⚠️ 주의사항

### SEO 영향
- 새 도메인은 **최소 2~4주** 색인 시간 소요
- 구글: 301 리다이렉트로 기존 순위 유지 가능
- 네이버: 도메인 변경 시 순위 초기화 가능성 있음

### 기존 링크
- 북마크, 외부 공유 링크는 **깨짐**
- 301 리다이렉트 설정으로 해결

---

## 📞 문제 발생 시

1. Vercel 배포 로그 확인
2. DNS 전파 확인 (https://dnschecker.org)
3. SSL 인증서 상태 확인
