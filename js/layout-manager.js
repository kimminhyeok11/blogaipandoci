// 레이아웃 자동화 매니저
// - 네비게이션 바와 본문 컨테이너의 너비를 자동 동기화
// - 이미지 자동 중앙 정렬 및 반응형 유지
// - 레이아웃 불일치 자동 검사 및 콘솔 진단 리포트 출력
// - 디자인 가이드라인(너비/패딩/간격) 적용

(function(){
  const DesignGuide = {
    // maxWidth: 'auto'는 네비게이션 바의 실제 너비를 기준으로 동기화
    maxWidth: 'auto',
    paddingX: 24,
    gap: 16,
    marginY: 40,
    imageMargin: 16,
    // 허용 오차(px)
    tolerance: 16,
  };

  const MOBILE_BREAKPOINT = 640;

  // 개발 로깅 플래그: localhost에서는 기본 활성, 그 외는 Config로 제어
  // 디버그 검사는 명시적으로 활성화된 경우에만 수행 (로컬 자동 활성화 제거)
  const debugLayout = !!(window.Config && window.Config.DEBUG_LAYOUT === true);

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 캐시 및 옵저버
  let cachedNavWidth = null;
  let navResizeObserver = null;

  function measureNavWidth() {
    const nav = q('#main-nav-container nav');
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    return Math.round(rect.width);
  }

  function setContentMaxWidthVar(px) {
    if (!px || !Number.isFinite(px)) return;
    const current = getComputedStyle(document.documentElement).getPropertyValue('--content-max-width').trim();
    const next = px + 'px';
    if (current !== next) {
      document.documentElement.style.setProperty('--content-max-width', next);
    }
  }

  function applyContentWidth(container) {
    if (!container) return;
    const maxWVar = getComputedStyle(document.documentElement).getPropertyValue('--content-max-width').trim();
    if (!maxWVar) return;
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (container.style.maxWidth !== maxWVar) container.style.maxWidth = maxWVar;
    if (container.style.marginLeft !== 'auto') container.style.marginLeft = 'auto';
    if (container.style.marginRight !== 'auto') container.style.marginRight = 'auto';
    // 모바일에서는 클래스 기반 패딩(px-0 등)을 존중하여 인라인 패딩 자동 적용을 생략
    if (!isMobile) {
      // 이미 CSS에서 패딩이 설정되어 있으면 인라인으로 재설정하지 않아 레이아웃 셰이크 최소화
      const cs = getComputedStyle(container);
      const padL = parseInt(cs.paddingLeft, 10) || 0;
      const padR = parseInt(cs.paddingRight, 10) || 0;
      if (padL === 0 && !container.style.paddingLeft) container.style.paddingLeft = DesignGuide.paddingX + 'px';
      if (padR === 0 && !container.style.paddingRight) container.style.paddingRight = DesignGuide.paddingX + 'px';
    }
  }

  function centerImages(scope) {
    const imgs = qa('img', scope || document);
    imgs.forEach(img => {
      // 리스트/카드 썸네일은 자체 레이아웃 규칙을 따르므로 중앙정렬 주입 제외
      if (img.closest('.post-card') || img.classList.contains('post-card-thumb-img')) return;
      if (img.dataset.centered === '1') return;
      img.style.display = 'block';
      img.style.margin = `${DesignGuide.imageMargin}px auto`;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.dataset.centered = '1';
    });
  }

  function collectContainers() {
    const list = [];
    const lib = q('#view-library > section'); if (lib) list.push(lib);
    const post = q('#view-post > article'); if (post) list.push(post);
    const arc = q('#view-archives > section'); if (arc) list.push(arc);
    const writer = q('#view-writer > section'); if (writer) list.push(writer);
    const isVisible = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    return list.filter(isVisible);
  }

  function inspectLayout() {
    const navW = measureNavWidth();
    const containers = collectContainers();
    const report = [];

    // 프로덕션/비디버그 환경에서는 무거운 검사 자체를 생략
    if (!debugLayout) return report;

    containers.forEach(el => {
      const rect = el.getBoundingClientRect();
      // 스크롤바 폭을 제외한 뷰포트 폭을 우선 사용해 좌/우 여백 불균형 오탐 줄이기
      const vW = document.documentElement.clientWidth || window.innerWidth;
      const isMobile = vW <= MOBILE_BREAKPOINT;
      const leftSpace = Math.round(rect.left);
      const rightSpace = Math.round(vW - rect.right);
      const marginBalanced = Math.abs(leftSpace - rightSpace) <= DesignGuide.tolerance;
      // 모바일에서는 컨테이너가 100% 폭으로 확장될 수 있으므로 폭 일치 검사 생략
      const widthMatches = isMobile ? true : (navW ? Math.abs(Math.round(rect.width) - navW) <= DesignGuide.tolerance : true);
      const issues = [];
      if (Math.round(rect.width) === 0) {
        // 숨겨진 컨테이너는 검사 제외
        return;
      }
      if (!widthMatches) issues.push(`컨테이너 너비(${Math.round(rect.width)}px) != 네비 너비(${navW}px)`);
      if (!marginBalanced) issues.push(`양측 마진 불균형 left=${leftSpace}px, right=${rightSpace}px`);
      // 카드/썸네일 이미지는 자체 레이아웃 규칙을 따르므로 중앙정렬 검사에서 제외
      const imgNotCentered = qa('img', el).filter(img => {
        if (img.closest('.post-card') || img.classList.contains('post-card-thumb-img')) return false;
        const cs = getComputedStyle(img);
        return !(cs.display === 'block' && cs.marginLeft === 'auto' && cs.marginRight === 'auto');
      }).length;
      if (imgNotCentered) issues.push(`중앙 정렬되지 않은 이미지 ${imgNotCentered}개`);
      report.push({ element: el, widthMatches, marginBalanced, imgNotCentered, issues });
    });

    if (debugLayout) {
      if (report.some(r => r.issues.length)) {
        console.group('%cLayout Inspector: 경고', 'color:#b45309;font-weight:bold');
        report.forEach((r, i) => {
          if (r.issues.length) {
            console.warn(`#${i+1}`, r.issues.join(' | '), r.element);
          }
        });
        console.info('제안:', [
          '- 컨테이너에 maxWidth를 네비게이션 너비로 동기화(자동 적용됨).',
          '- 양측 마진을 auto로 설정해 중앙 정렬 유지(자동 적용됨).',
          '- 이미지에 display:block + margin:auto 지정(자동 적용됨).',
        ].join('\n'));
        console.groupEnd();
      } else {
        console.log('%cLayout Inspector: 일관성 OK', 'color:#16a34a;font-weight:bold');
      }
    }
    return report;
  }

  function applyGuidelinesTo(container) {
    if (!container) return;
    container.style.gap = DesignGuide.gap + 'px';
  }

  function syncAll() {
    // 1) 읽기 단계
    const navW = measureNavWidth();
    // 2) 쓰기 단계
    // 폭 재동기화 임계값: 미세한 변경(<=4px)은 무시해 레이아웃 셰이크 방지
    const WIDTH_UPDATE_THRESHOLD = 4;
    if (navW) {
      if (cachedNavWidth === null) {
        cachedNavWidth = navW;
        setContentMaxWidthVar(navW);
      } else if (Math.abs(navW - cachedNavWidth) > WIDTH_UPDATE_THRESHOLD) {
        cachedNavWidth = navW;
        setContentMaxWidthVar(navW);
      }
    }
    const containers = collectContainers();
    containers.forEach(el => {
      applyContentWidth(el);
      applyGuidelinesTo(el);
      centerImages(el);
    });
    // 3) (디버그 전용) 검사 단계 — 읽기 비용이 커서 필요시에만
    inspectLayout();
  }

  // 디바운스된 동기화 스케줄러 (강제 리플로우 완화)
  let rafId = null;
  function scheduleSync() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      syncAll();
    });
  }

  function onViewRendered(view) {
    // 뷰가 표시될 때마다 디바운스 동기화
    scheduleSync();
  }

  function init() {
    // 초기 페인트 전에 1차 동기화 실행해 큰 폭의 레이아웃 변경을 방지
    scheduleSync();
    // 폰트 준비 후 미세 보정만 수행
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => scheduleSync());
    }
    // DOM 변경을 감지해 자동 적용
    const app = q('#app-container');
    if (app) {
      const mo = new MutationObserver(() => {
        scheduleSync();
      });
      mo.observe(app, { childList: true, subtree: true });
    }
    // 네비게이션 폭 변경만을 정확히 감지하여 불필요한 재측정을 줄임
    const nav = q('#main-nav-container nav');
    if (nav && 'ResizeObserver' in window) {
      navResizeObserver = new ResizeObserver(() => scheduleSync());
      navResizeObserver.observe(nav);
    }
    // 리사이즈 시 네비 너비 재측정 후 재적용
    window.addEventListener('resize', () => scheduleSync());
  }

  window.DesignGuide = DesignGuide;
  window.LayoutManager = { init, onViewRendered, syncAll };
})();