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
    tolerance: 2,
  };

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function measureNavWidth() {
    const nav = q('#main-nav-container nav');
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    return Math.round(rect.width);
  }

  function setContentMaxWidthVar(px) {
    if (!px || !Number.isFinite(px)) return;
    document.documentElement.style.setProperty('--content-max-width', px + 'px');
  }

  function applyContentWidth(container) {
    if (!container) return;
    const maxWVar = getComputedStyle(document.documentElement).getPropertyValue('--content-max-width').trim();
    if (!maxWVar) return;
    container.style.maxWidth = maxWVar;
    container.style.marginLeft = 'auto';
    container.style.marginRight = 'auto';
    container.style.paddingLeft = container.style.paddingLeft || DesignGuide.paddingX + 'px';
    container.style.paddingRight = container.style.paddingRight || DesignGuide.paddingX + 'px';
  }

  function centerImages(scope) {
    const imgs = qa('img', scope || document);
    imgs.forEach(img => {
      img.style.display = 'block';
      img.style.margin = `${DesignGuide.imageMargin}px auto`;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    });
  }

  function collectContainers() {
    const list = [];
    const lib = q('#view-library > section'); if (lib) list.push(lib);
    const post = q('#view-post > article'); if (post) list.push(post);
    const arc = q('#view-archives > section'); if (arc) list.push(arc);
    const writer = q('#view-writer > section'); if (writer) list.push(writer);
    return list;
  }

  function inspectLayout() {
    const navW = measureNavWidth();
    const containers = collectContainers();
    const report = [];

    containers.forEach(el => {
      const rect = el.getBoundingClientRect();
      const vW = window.innerWidth;
      const leftSpace = Math.round(rect.left);
      const rightSpace = Math.round(vW - rect.right);
      const marginBalanced = Math.abs(leftSpace - rightSpace) <= DesignGuide.tolerance;
      const widthMatches = navW ? Math.abs(Math.round(rect.width) - navW) <= DesignGuide.tolerance : true;
      const issues = [];
      if (!widthMatches) issues.push(`컨테이너 너비(${Math.round(rect.width)}px) != 네비 너비(${navW}px)`);
      if (!marginBalanced) issues.push(`양측 마진 불균형 left=${leftSpace}px, right=${rightSpace}px`);
      const imgNotCentered = qa('img', el).filter(img => {
        const cs = getComputedStyle(img);
        return !(cs.display === 'block' && cs.marginLeft === 'auto' && cs.marginRight === 'auto');
      }).length;
      if (imgNotCentered) issues.push(`중앙 정렬되지 않은 이미지 ${imgNotCentered}개`);
      report.push({ element: el, widthMatches, marginBalanced, imgNotCentered, issues });
    });

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
    return report;
  }

  function applyGuidelinesTo(container) {
    if (!container) return;
    container.style.gap = DesignGuide.gap + 'px';
  }

  function syncAll() {
    const navW = measureNavWidth();
    if (navW) setContentMaxWidthVar(navW);
    collectContainers().forEach(el => {
      applyContentWidth(el);
      applyGuidelinesTo(el);
      centerImages(el);
    });
    inspectLayout();
  }

  function onViewRendered(view) {
    // 뷰가 표시될 때마다 동기화 및 검사 수행
    syncAll();
  }

  function init() {
    // 초기 동기화
    syncAll();
    // DOM 변경을 감지해 자동 적용
    const app = q('#app-container');
    if (app) {
      const mo = new MutationObserver(() => {
        syncAll();
      });
      mo.observe(app, { childList: true, subtree: true });
    }
    // 리사이즈 시 네비 너비 재측정 후 재적용
    window.addEventListener('resize', () => syncAll());
  }

  window.DesignGuide = DesignGuide;
  window.LayoutManager = { init, onViewRendered, syncAll };
})();