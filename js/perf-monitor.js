// 간단한 웹 성능 모니터 (LCP/CLS/FID) - 콘솔 로그 및 측정
// 크로스 브라우저 호환을 위해 가드 포함

(function(){
  if (typeof PerformanceObserver === 'undefined') return;

  const metrics = {};
  // 전역 노출로 디버깅/자동화 스크립트가 접근 가능
  window.PerfMetrics = metrics;
  // 실시간 전송 설정
  const METRICS_ENDPOINT = '/api/metrics';
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const sendMetric = (name, value, extra = {}) => {
    try {
      const payload = {
        name,
        value,
        path: window.location.pathname,
        href: window.location.href,
        ua: navigator.userAgent,
        ts: Date.now(),
        conn: (navigator.connection && navigator.connection.effectiveType) || null,
        ...extra
      };
      if (isLocalHost) return;
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        try {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(METRICS_ENDPOINT, blob);
          return;
        } catch (_) { /* fallthrough */ }
      }
      fetch(METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {});
    } catch (_) { /* noop */ }
  };

  // 오버레이 활성화 조건: ?perf=1 또는 Config 플래그
  const params = new URLSearchParams(window.location.search);
  const showOverlay = params.get('perf') === '1' || (window.Config && window.Config.SHOW_PERF_OVERLAY === true);

  // 오버레이 생성 및 업데이트
  let overlayEl = null;
  const ensureOverlay = () => {
    if (!showOverlay) return;
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'perf-overlay';
    overlayEl.setAttribute('role', 'status');
    overlayEl.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:9999',
      'background:rgba(17,24,39,0.8)', // gray-900 with opacity
      'color:#fff',
      'backdrop-filter:saturate(120%) blur(2px)',
      'border-radius:10px',
      'padding:10px 12px',
      'font:12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Noto Sans KR',
      'box-shadow:0 8px 24px rgba(0,0,0,0.25)'
    ].join(';');
    overlayEl.innerHTML = '<div style="font-weight:600;margin-bottom:6px">Performance</div>'
      + '<div id="perf-lines"></div>'
      + '<div style="margin-top:6px;opacity:.8">?perf=1로 표시 중</div>';
    document.body.appendChild(overlayEl);
    return overlayEl;
  };

  const renderOverlay = () => {
    if (!showOverlay) return;
    if (!overlayEl) ensureOverlay();
    const linesEl = overlayEl.querySelector('#perf-lines');
    const v = metrics;
    const kv = [
      ['LCP', v.LCP ? `${(v.LCP/1000).toFixed(2)}s` : '-'],
      ['CLS', v.CLS !== undefined ? String(v.CLS) : '-'],
      ['FID', v.FID !== undefined ? `${Math.round(v.FID)}ms` : '-'],
      ['TTFB', v.TTFB !== undefined ? `${Math.round(v.TTFB)}ms` : '-'],
    ];
    linesEl.innerHTML = kv.map(([k, val]) => `<div><span style="display:inline-block;width:42px;opacity:.8">${k}</span> <span style="font-weight:600">${val}</span></div>`).join('');
  };

  const log = (name, value, extra = {}) => {
    metrics[name] = value;
    // 개발 환경에서만 콘솔 출력
    const isDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isDevHost) {
      console.log(`[perf] ${name}:`, value, extra);
    }
    // 실시간 전송 (프로덕션에서 동작)
    sendMetric(name, value, extra);
    renderOverlay();
  };

  // JS 힙 메모리 사용량 샘플링 (Chrome 전용)
  try {
    const sampleMemory = () => {
      const m = performance && performance.memory;
      if (!m) return;
      log('JSHeapUsed', m.usedJSHeapSize, { total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit });
    };
    if (document.readyState === 'complete') {
      sampleMemory();
    } else {
      window.addEventListener('load', () => setTimeout(sampleMemory, 1200), { once: true });
    }
    // 초기 상호작용 이후 한 번 더 샘플링
    window.addEventListener('click', () => setTimeout(sampleMemory, 800), { once: true });
  } catch (_) {}

  // Long Tasks 감지로 CPU 차단 지표 보강
  try {
    const ltObs = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      for (const e of entries) {
        log('LongTask', e.duration, { name: e.name || 'longtask' });
      }
    });
    ltObs.observe({ type: 'longtask', buffered: true });
  } catch (_) {}

  try {
    // Largest Contentful Paint (LCP)
    const lcpObs = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const last = entries[entries.length - 1];
      if (last) log('LCP', last.renderTime || last.loadTime || last.startTime, { size: last.size });
    });
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  try {
    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObs = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          log('CLS', Number(clsValue.toFixed(4)));
        }
      }
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}

  try {
    // First Input Delay (FID)
    const fidObs = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      for (const entry of entries) {
        if (entry.name === 'first-input') {
          log('FID', entry.processingStart - entry.startTime);
        }
      }
    });
    fidObs.observe({ type: 'first-input', buffered: true });
  } catch (_) {}

  // 네비게이션 타이밍
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      log('TTFB', nav.responseStart);
      log('DOM Interactive', nav.domInteractive);
      log('Load Event End', nav.loadEventEnd);
    }
  } catch (_) {}

  // DOM이 준비되면 오버레이 생성
  if (showOverlay) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureOverlay, { once: true });
    } else {
      ensureOverlay();
    }
  }
})();