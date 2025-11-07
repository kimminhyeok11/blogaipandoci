// 간단한 웹 성능 모니터 (LCP/CLS/FID) - 콘솔 로그 및 측정
// 크로스 브라우저 호환을 위해 가드 포함

(function(){
  if (typeof PerformanceObserver === 'undefined') return;

  const metrics = {};
  const log = (name, value, extra = {}) => {
    metrics[name] = value;
    // 개발 환경에서만 콘솔 출력
    const isDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isDevHost) {
      console.log(`[perf] ${name}:`, value, extra);
    }
  };

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
})();