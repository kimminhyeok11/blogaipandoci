# 法 BLOG - 프로젝트 현황 및 기술 문서

> 최종 업데이트: 2026-05-17  
> 담당자: 김민혁  
> 상태: SEO 최적화 완료, 운영 안정화 단계

---

## 📊 프로젝트 개요

법률/절차 정보를 다루는 저널리즘 스타일 블로그 플랫폼. AI 자동 발행 + 수동 편집 하이브리드 운영 중.

- **사이트**: https://lawtiphub.com
- **배포**: Vercel (Serverless)
- **데이터**: Supabase (PostgreSQL + Storage)
- **글 수**: 255+ (SSG 완료)

---

## ✅ 최근 완료 작업 (2026-05-17)

### 1. situations_cache slug 인코딩 문제 해결
**문제**: DB에 percent-encoded slug (`%EC%A0%84...`) 저장 → 404 발생
**해결**:
- `src/lib/situations.ts`에 `safeDecode()`, `checkDoubleEncoding()` 추가
- `phraseToSlug()`에서 UTF-8 원본만 반환하도록 수정
- Supabase에서 `TRUNCATE TABLE situations_cache` 실행 완료
- 글 수정/발행 시 자동 재생성

### 2. 문맥 기반 내부링크 자동화
**파일**: `src/lib/internal-links.ts`

**규칙 (SEO 과최적화 방지)**:
- 문단당 최대 1개 링크
- 본문 전체 최대 5개 링크
- 동일 키워드 1회만 링크
- 첫 등장만 링크
- 이미 a 태그 내부는 제외
- heading(h1~h6), table, code, pre 내부 제외
- 주변 100자 내 링크 중복 금지
- 자연문장 내부에만 삽입 (앞뒤 3단어 이상)
- anchor text 다양화 (`anchorVariants`)

**키워드 우선순위**:
1. 형사/고소 (priority 100)
2. 전세금 반환 (priority 100)
3. 손해배상/강제집행 (priority 90-95)
4. 채무/상속/이혼 (priority 85-90)
5. 노동/세금/절차 일반 (priority 60-80)

### 3. Sitemap 분할
**구조**:
```
/sitemap.xml              # index sitemap
/sitemaps/posts-1.xml     # 최신 100개
/sitemaps/posts-2.xml     # 101~250번째
/sitemaps/tags.xml        # 태그 페이지
/sitemaps/cases.xml       # 사건 유형
/sitemaps/static.xml      # 정적 페이지
```

### 4. 댓글 API Rate Limit
**파일**: `src/lib/rate-limit.ts`
- GET: 60 req/min per IP
- POST: 5 req/min per IP
- in-memory 구현 (Redis 불필요 현재 규모)

### 5. Stale 콘텐츠 알림
**파일**: `src/components/posts/FreshnessBadge.tsx`
- 90일 이상: amber 배지 + "최신 실무 기준과 다를 수 있습니다"
- 60~90일: blue 배지 + "곧 검토 예정"
- 관련 case_type 링크 자동 표시

### 6. JSON-LD 강화
**파일**: `src/app/posts/[slug]/page.tsx`
- `BlogPosting` (기존)
- `WebPage` (신규)
- `BreadcrumbList` (기존)
- `Comment` (신규 - 댓글 있을 때만)

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── api/                    # API 라우트
│   │   ├── comments/          # 댓글 (rate limit 적용)
│   │   ├── posts/             # 글 CRUD (관련글 자동링크)
│   │   ├── og/                # OG 이미지 (edge runtime)
│   │   └── sitemaps/          # sitemap 분할
│   ├── posts/[slug]/           # 글 상세 (JSON-LD 4종)
│   ├── cases/[type]/         # 사건 유형 허브
│   ├── situations/[slug]/    # 상황별 허브 (situations_cache)
│   └── sitemap.xml/          # index sitemap
├── components/
│   ├── posts/
│   │   ├── FreshnessBadge.tsx # stale 알림
│   │   ├── SimilarPosts.tsx   # 유사글 (embedding + fallback)
│   │   └── PostContent.tsx    # 마크다운 렌더링
│   └── comments/
├── lib/
│   ├── internal-links.ts      # 문맥 내부링크
│   ├── situations.ts          # situations_cache 관리
│   ├── rate-limit.ts          # API rate limiter
│   └── markdown.ts            # 마크다운 처리 (링크 후처리)
└── types/
```

---

## 🔧 주요 기능 상세

### 내부링크 처리 흐름
```
[글 저장]
  ↓
appendRelatedLinks() - 기존 관련글 링크 (하단 목록 + 본문 인라인)
  ↓
[글 조회]
  ↓
processMarkdown() → addInternalLinks() - 문맥 기반 키워드 링크
```

**충돌 방지**: 기존 `injectInlineLinks`는 저장 시 실행, 새 `addInternalLinks`는 조회 시 실행. 서로 다른 단계.

### SimilarPosts 고도화
**파일**: `src/components/posts/SimilarPosts.tsx`

1. embedding 기반 유사 검색 (pgvector)
2. 부족하면 case_type/current_stage 기반 보충
3. 여전히 부족하면 같은 case_type 인기글 보충
4. 최대 4개 반환

### situations_cache 갱신
**트리거**: 글 발행/수정 시 `refreshSituationsCache()` 호출

**점수 계산**:
```
score = (view_count / maxViews) * 0.7 + freshness * 0.3
```

**중복 제거**: 같은 `phrase`는 점수 높은 것만 유지, 최대 20개 저장

---

## ⚙️ 환경변수

```env
# 필수
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 검색엔진
INDEXNOW_KEY=
NEXT_PUBLIC_SITE_URL=https://lawtiphub.com

# AI (선택)
OPENAI_API_KEY=

# 알림 (선택)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

## 🚀 배포 체크리스트

### Vercel 배포 전
- [ ] `situations_cache` 정상화 확인
- [ ] sitemap 분할 URL 접속 테스트
- [ ] 댓글 rate limit 동작 확인

### 배포 후
- [ ] `/sitemap.xml` - index 확인
- [ ] `/situations/전세금-반환-소송` - 404 여부 확인
- [ ] 아무 글 페이지 - 내부링크 클릭 확인
- [ ] 90일 이상 된 글 - FreshnessBadge 표시 확인
- [ ] 개발자도구 Console - `%25` 관련 에러 없음 확인

---

## 📈 모니터링 포인트

### 로그 확인
```bash
# Vercel 로그
vercel logs --production
```

**주요 검색 패턴**:
- `[situations] double encoded slug detected` - 이중 인코딩 감지
- `[situations] CRITICAL: double encoded slug` - 심각한 인코딩 문제
- `rate limit exceeded` - rate limit 작동 중

### SEO 확인
- Google Search Console - 색인 상태
- `/api/debug-situations` - situations_cache 상태 확인

---

## 🐛 알려진 이슈 & 해결책

| 이슈 | 원인 | 해결책 |
|------|------|--------|
| situations 404 | slug 인코딩 깨짐 | `TRUNCATE` 후 재생성 |
| 댓글 스팸 | API 남용 | rate limit 적용됨 |
| sitemap 과대 | 글 500개+ | posts-3.xml 추가 필요 |

---

## 📝 다음 작업자를 위한 노트

### 긴급 대응이 필요한 경우
1. **situations 404 대량 발생**: `TRUNCATE TABLE situations_cache;` 실행 후 글 하나 수정
2. **DB 부하**: `refreshSituationsCache()`가 동기적으로 실행되지 않도록 확인
3. **OG 이미지 오류**: `/api/og` edge runtime 확인

### 기능 추가 시 주의
- **내부링크 키워드 추가**: `src/lib/internal-links.ts`의 LEGAL_KEYWORDS에 추가, priority 60 이하로 설정하여 과삽입 방지
- **새 sitemap 청크**: `posts-3` 등 추가 시 `sitemap.xml/route.ts` index에도 추가
- **Rate limit 조정**: `src/lib/rate-limit.ts`의 숫자 조정

### 현재 규모에서 불필요한 것
- Redis (Upstash) - in-memory rate limit으로 충분
- Edge Runtime 확대 - OG 이미지만 사용 중
- DB 샤딩 - 255개 글로 불필요
- GraphQL - REST로 충분

---

## 📚 관련 문서

- `README.md` - 기본 소개
- `DEVELOPMENT_NOTES.md` - 개발 상세 (있는 경우)
- Supabase Dashboard: https://app.supabase.io
- Vercel Dashboard: https://vercel.com/dashboard

---

## 👥 담당자 연락망

- **현재**: 김민혁
- **GitHub**: https://github.com/kimminhyeok11/blogaipandoci

---

*문서 버전: v1.0 (2026-05-17)*
