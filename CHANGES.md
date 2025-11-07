# 변경 이력

## 2025-11-06

- fix(router): 동일 뷰 재전환 시 `DOM.hide`/`DOM.show` 애니메이션 충돌로 빈 화면이 되는 레이스 조건 제거
  - `js/blog-app.js`의 `handleRouting`에서 대상 뷰를 먼저 계산하고, 활성 뷰와 동일하면 숨김을 생략하도록 수정
- feat(nav): 현재 경로에 해당하는 네비게이션 링크 강조 및 접근성 속성(`aria-current`) 추가
  - `renderNav` 내부에서 활성 링크에 `font-semibold` 적용
- docs: 라우팅/네비 수정 사항 주석 보강
  - 관련 코드 블록에 변경 의도와 맥락 주석 추가

- perf: LCP/CLS/FID 측정용 경량 모듈 추가 (`js/perf-monitor.js`)
  - 개발 환경에서 콘솔로 지표 출력, 의존성 없음
- layout: 포스트 상세 컨테이너 폭을 `max-w-4xl`로 통일
  - 네비게이션 바와 본문 폭의 불일치를 제거
- test: 레이아웃 폭 및 라우팅 동작 스모크 테스트 보강
  - `tests/routing.spec.html`에 폭 일치 검증 추가

- feat(layout-automation): 레이아웃 자동화 시스템 도입
  - `js/layout-manager.js`: 네비 너비 동기화, 이미지 자동 중앙 정렬, 자동 검사/진단 리포트, 가이드라인 적용
  - `index.html`: 레이아웃 매니저 로드 및 초기화 연동
  - `js/blog-app.js`: 뷰 전환 훅에서 레이아웃 매니저 호출
  - `css/layout.css`: 컨테이너 중앙 정렬/이미지 중앙 정렬 규칙 및 CSS 변수 추가