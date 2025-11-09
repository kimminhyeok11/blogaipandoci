export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).send('Method Not Allowed');
      return;
    }
    const body = (() => {
      try { return typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch { return {}; }
    })();

    // 기본 필드 추출
    const name = String(body.name || '').slice(0, 64);
    const value = Number(body.value || 0);
    const ts = Number(body.ts || Date.now());
    const path = String(body.path || '/').slice(0, 512);
    const href = String(body.href || '').slice(0, 1024);
    const ua = String(body.ua || (req.headers['user-agent'] || '')).slice(0, 512);
    const conn = String(body.conn || '').slice(0, 32);
    const extra = body.extra || null;

    // 저장 최소화: 허용된 메트릭만 수집, 봇 요청은 무시
    const allowed = new Set(['LCP','CLS','FID','INP','TTFB']);
    const isBot = /bot|crawler|spider|preview|fetch|facebookexternalhit|Twitterbot/i.test(ua);
    if (!allowed.has(name) || isBot) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', '0');
      res.status(204).end();
      return;
    }

    // Supabase에 저장 (환경변수 기반)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    let stored = false;
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error } = await supabase.from('web_vitals').insert({
          name, value, ts, path, href, ua, conn, extra
        });
        if (!error) stored = true;
      } catch (e) { /* noop: 저장 실패 시에도 204 처리 */ }
    }
    // 캐시 비활성화 (즉시 수집)
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', '0');
    res.status(204).end();
  } catch (e) {
    res.status(500).send('Metrics error: ' + (e?.message || e));
  }
}