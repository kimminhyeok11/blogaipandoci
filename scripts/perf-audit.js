// Run Lighthouse programmatically against local server and output JSON/HTML reports
// Usage: node scripts/perf-audit.js [url]
// Defaults to http://127.0.0.1:8081/

const fs = require('fs');
const path = require('path');


(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8081/';
  const { launch } = await import('chrome-launcher');
  const lighthouse = (await import('lighthouse')).default;

  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
  const opts = { logLevel: 'info', output: ['html', 'json'], onlyCategories: ['performance'], port: chrome.port };
  const config = null; // default
  try {
    const runnerResult = await lighthouse(url, opts, config);

    const reportHtml = runnerResult.report[0];
    const reportJson = runnerResult.report[1];

    const outDir = path.resolve(__dirname, '..', 'deploy');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlPath = path.join(outDir, `lighthouse-${stamp}.html`);
    const jsonPath = path.join(outDir, `lighthouse-${stamp}.json`);
    fs.writeFileSync(htmlPath, reportHtml, 'utf8');
    fs.writeFileSync(jsonPath, reportJson, 'utf8');

    const perfScore = runnerResult.lhr.categories.performance.score * 100;
    const audits = runnerResult.lhr.audits;
    const metrics = {
      LCP: audits['largest-contentful-paint'].numericValue,
      CLS: audits['cumulative-layout-shift'].numericValue,
      FCP: audits['first-contentful-paint'].numericValue,
      TBT: audits['total-blocking-time'].numericValue,
      SI: audits['speed-index'].numericValue,
    };

    console.log('[lh] Performance score:', perfScore);
    console.log('[lh] Metrics:', metrics);
    console.log('[lh] Reports saved:', { htmlPath, jsonPath });

    // Threshold check (web vitals): LCP<2500ms, CLS<0.1, TBT<200ms, Perf>=90
    const needsImprove = (
      perfScore < 90 || metrics.LCP > 2500 || metrics.CLS > 0.1 || metrics.TBT > 200
    );
    if (needsImprove) {
      console.error('[lh] 성능 개선 필요:', { perfScore, ...metrics });
      process.exitCode = 2;
    } else {
      console.log('[lh] 성능 기준 충족');
    }
  } catch (e) {
    console.error('[lh] Lighthouse 실행 실패:', e.message || e);
    process.exitCode = 1;
  } finally {
    await chrome.kill();
  }
})();