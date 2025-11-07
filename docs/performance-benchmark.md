# 성능 벤치마크 및 최적화 문서

본 문서는 시스템의 핵심 성능 요소(응답 시간, 메모리, CPU, 데이터베이스, 캐싱)에 대한 개선 내역과 측정 결과, 향후 최적화 가이드를 정리합니다.

## 측정 환경
- 대상: `http://127.0.0.1:8083/`
- 툴: Lighthouse (스크립트 `scripts/perf-audit.js`), 내장 성능 오버레이(`?perf=1`)
- 프로필: 기본(모바일 에뮬레이션)

## 최근 Lighthouse 결과
- 2025-11-07T05:52:00Z
  - Performance: 99
  - LCP: 1664.68ms
  - FCP: 1664.68ms
  - CLS: 0
  - TBT: 0
  - SI: 1664.68ms
  - 보고서: `deploy/lighthouse-2025-11-07T05-52-00-472Z.(html|json)`

### 과거 대비 변화(참고용)
- 2025-11-07T05:23:34Z: LCP 4466.50ms, FCP 1666.87ms, SI 3091.39ms
- 2025-11-07T05:09:43Z: LCP 4001.96ms, FCP 1683.99ms, SI 1976.42ms

=> LCP가 약 2.4~2.8초 개선되었습니다.

## 적용한 최적화
1) 네트워크/알고리즘
- 동일 키 요청 중복 제거 및 레이스 가드 추가 (`withDedupe`, 홈/아카이브/인기글 로더 적용)
- 아카이브에서 태그 필터 미사용 시 `refined_content` 비조회로 페이로드 축소

2) 이미지/LCP
- 홈 첫 카드 썸네일: `fetchpriority="high"`, 나머지: `lazy + fetchpriority="low"`
- 썸네일 `srcset/sizes` 및 WebP 변환 유지, 불필요 이미지 제거

3) 캐싱 전략
- SWR 캐시 사용(홈 10분, 인기 15분 등), 키에 카테고리/태그/페이지 포함
- 오프라인/빈 데이터/에러 처리로 불필요 리트라이 방지

4) 측정 강화
- 성능 오버레이에 JS 힙 메모리(`performance.memory`) 샘플링 추가
- Long Task 관측(PerformanceObserver: `longtask`)로 CPU 차단 이벤트 기록

## DB 쿼리 및 인덱스 최적화 가이드 (Supabase/Postgres)
아래 인덱스는 공개/아카이브/인기글 조회 패턴을 대상으로 합니다.

```sql
-- 공개 게시글 최신순 목록 (홈/아카이브)
CREATE INDEX IF NOT EXISTS idx_posts_status_created_at
  ON posts (status, created_at DESC);

-- 카테고리별 공개 최신순 (아카이브)
CREATE INDEX IF NOT EXISTS idx_posts_category_status_created_at
  ON posts (category, status, created_at DESC);

-- 인기글 (조회수 내림차순)
CREATE INDEX IF NOT EXISTS idx_posts_status_view_count
  ON posts (status, view_count DESC);

-- 선택적으로, 공개글만을 위한 파셜 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_published_created_at
  ON posts (created_at DESC)
  WHERE status = 'published';
```

추가 권장 사항
- 선택 컬럼 최소화(이미 적용). 태그 없는 아카이브 조회는 `refined_content` 제외
- 페이지네이션 범위(`range`) 외의 컬럼 전달 지양
- 정렬 기준과 필터 컬럼을 인덱스 선두에 배치

## 캐싱·리소스 관리 권장
- SWR TTL 튜닝: 트래픽/변동성 기준(홈 5~10분, 인기 10~20분)
- LCP 후보 외 리소스 `fetchpriority="low"` 유지, 초기 페인트 이후 로드
- 이미지 `width/height` 명시로 레이아웃 안정화, `sizes` 정확화
- 번들 코드 스플리팅/지연 로드(상호작용 이후 로딩)

## 벤치마크 절차
1) Lighthouse 스크립트 실행
```powershell
node scripts/perf-audit.js http://127.0.0.1:8083/ --out deploy
```
2) 성능 기준
- Performance ≥ 90, LCP < 2500ms, CLS < 0.1, TBT < 200ms
3) 결과 확인
- `deploy/lighthouse-YYYY-...(.html|.json)` 파일 검토

4) 304/ETag 재검증 테스트(배포 환경)
```powershell
# 첫 요청: 헤더 확인
Invoke-WebRequest 'https://<도메인>/feed.xml' -Method Head
Invoke-WebRequest 'https://<도메인>/sitemap.xml' -Method Head

# ETag 값으로 재검증(304 기대)
$etag = (Invoke-WebRequest 'https://<도메인>/feed.xml' -Method Head).Headers.ETag
Invoke-WebRequest 'https://<도메인>/feed.xml' -Headers @{ 'If-None-Match'=$etag } -Method Head

$etag2 = (Invoke-WebRequest 'https://<도메인>/sitemap.xml' -Method Head).Headers.ETag
Invoke-WebRequest 'https://<도메인>/sitemap.xml' -Headers @{ 'If-None-Match'=$etag2 } -Method Head
```

5) 서버 로그/모니터링 지표
- 304 비율(총 요청 대비): 증가가 기대됨
- 함수 실행 시간/횟수: 감소가 기대됨
- 응답 바이트 크기: HEAD/304 케이스에서 현저히 작아짐

4) 메모리/CPU 실측(개발 중 수동 프로파일)
- 브라우저로 `?perf=1` 접근 → 오버레이에서 `JSHeapUsed` 및 `LongTask` 이벤트 확인
- 기능 추가 시 초기 로드/상호작용 후 각각 한 번 이상 확인

## 개선 효과 정리(현재)
- LCP: 약 4.0~4.47s → 1.66s로 개선
- 중복 요청 제거로 네트워크/CPU 낭비 감소, UI 안정성 향상
- 아카이브 페이로드 축소로 응답 시간 및 메모리 사용 저감(태그 미사용 케이스)

## 다음 액션 제안
- 위 인덱스 적용 후 쿼리 플랜 확인(`EXPLAIN ANALYZE`)으로 실측 튜닝
- SWR TTL 재조정 및 아카이브 캐시 키에 페이지 크기/정렬 모드 포함
- 성능 스크립트 CI 통합(메인 브랜치에서 기준 미달 시 경고/차단)
- 캐시 TTL 상향 검토(s-maxage 600→1800), 1~2일 모니터링 후 결정