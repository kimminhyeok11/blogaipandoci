# 테스트 계획 및 결과 기록 (InsureLog)

## 개요
- 목적: 기능/성능/사용성 전반의 이슈를 반복적으로 탐지·개선하여 품질 기준을 충족
- 기준: 모든 테스트 케이스 통과, Lighthouse 성능 목표(Perf ≥ 90, LCP ≤ 2500ms, CLS ≤ 0.1), 사용자 피드백 긍정적

## 현재 측정 지표 (2025-11-07)
- Lighthouse Perf: 83
- LCP: 3506ms (이전 3865ms → 개선)
- CLS: 0.164 (목표 0.1 이하 필요)
- FCP: 1427ms
- TBT: 51ms
- SI: 3373ms
- 보고서: deploy/lighthouse-2025-11-07T04-40-37-516Z.json

## 테스트 케이스(초안)
### 기능
- 홈 목록 로드: 프리패치 데이터 적용 시 즉시 렌더, Supabase 없을 때 안내 문구 표시
- 네비 이동: 홈/아카이브/로그인/글쓰기/대시보드 라우팅 및 aria-current 활성 표시
- 이미지 최적화: 썸네일 및 본문 이미지의 srcset/sizes/format(webp)/lazy/decoding 적용
- 에러 처리: 오프라인/빈 목록/강제 오류 시나리오 메시지 노출

### 라우팅
- 선언형 라우터 로드 여부: `window.Router` 존재 및 `resolve()` 정상 동작
- `/`·`/home` → 홈 렌더링 호출, 네비 하이라이트 갱신
- `/post/:slug` → 포스트 모달 열림, 닫기 후 히스토리 정상 복귀
- `/archives` → 아카이브 모달 열림, 필터 변경 시 `navigate()`로 URL 반영
- `/writer`·`/writer/:slug` → 작성 모달/편집 모달 열림
- `/login` → 로그인 모달 열림, 닫기 시 홈으로 이동

### 모달 접근성
- 모달 열림 시 `body.modal-open` 적용 및 배경 inert/aria-hidden 설정
- 초기 포커스 첫 포커스 가능한 요소로 이동, 탭 순환(포커스 트랩) 정상
- ESC 키로 닫힘, 오버레이 클릭으로 닫힘, 닫힌 후 원래 포커스 복원
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby` 설정 확인

### 성능
- 초기 렌더: 폰트 비동기 로드(display=optional), 비임계 CSS preload→lazy 적용
- 데이터 프리패치: REST 병렬 프리패치 성공 여부 및 즉시 렌더 반영
- CLS/LCP: 헤더/카드/이미지 레이아웃 셰이크 존재 여부

### 사용성
- 모바일 메뉴: 햄버거 버튼 동작/위치 계산/외부 클릭·ESC 닫기
- 접근성: aria 속성, 포커스 표시, 토스트/에러 배너 읽기 순서

## 이슈 카탈로그(초안)
- [CLS] 홈 카드 이미지에 레이아웃 매니저가 margin을 주입해 셰이크 발생 가능
- [CLS] 헤더 `nav` 내부 요소 크기 변동으로 초기 높이 흔들림 가능
- [LCP] 데이터 준비 전 스켈레톤→실제 컨텐츠 교체 시 박스 차이 존재

## 개선 계획(1차)
- 레이아웃 매니저의 `centerImages`를 리스트/카드(`.post-card`, `.post-card-thumb-img`)에서는 제외
- 헤더 `#main-nav-container nav`에 `min-height` 및 정렬 고정
- 이후 Lighthouse 재측정 및 문서 업데이트

## 실행/결과 업데이트 로그
- 1차: REST 프리패치 도입 및 스크립트 로딩 순서 최적화 → LCP 약 1초 개선
- 2차: 레이아웃 매니저 이미지 중앙정렬 제외 & 헤더 nav 높이/정렬 예약 적용 → Perf 83, LCP 3.5s, CLS 0.164로 개선
 - 3차: 라우터 모듈 분리 및 모달 접근성 점검 → 경로별 모달 UX 안정화