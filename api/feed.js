export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const SITE_URL = process.env.SITE_URL || 'https://blogaipandoci.vercel.app';
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return;
    }
    // CDN 캐시 및 SWR: 10분 캐시, 24시간 동안 배경 재검증 허용
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const includeContent = process.env.FEED_INCLUDE_CONTENT === '1';
    const selectCols = includeContent
      ? 'slug, title, summary, updated_at, created_at, status, category, thumbnail_url, refined_content'
      : 'slug, title, summary, updated_at, created_at, status, category, thumbnail_url';
    const { data, error } = await supabase
      .from('posts')
      .select(selectCols)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    // 변경 감지용 ETag/Last-Modified 헤더로 304 응답 지원
    const timestamps = (data || []).map(p => new Date(p.updated_at || p.created_at || Date.now()).getTime());
    const lastTs = timestamps.length ? Math.max(...timestamps) : Date.now();
    const lastMod = new Date(lastTs).toUTCString();
    const etag = `W/"feed-${(data || []).length}-${lastTs}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', lastMod);
    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    if ((inm && inm === etag) || (ims && new Date(ims).getTime() >= lastTs)) {
      res.status(304).end();
      return;
    }

    const items = (data || []).map(p => {
      const url = `${SITE_URL}/post/${encodeURIComponent(p.slug)}`;
      const pubDate = new Date(p.created_at || Date.now()).toUTCString();
      const updated = new Date(p.updated_at || p.created_at || Date.now()).toUTCString();
      const title = escapeXml(p.title || '제목 없음');
      const desc = escapeXml(p.summary || '');
      const cats = [];
      if (p.category) cats.push(p.category);
      const tags = extractTagsFromHTML(p.refined_content || '') || [];
      tags.forEach(t => cats.push(t));
      const catXml = cats.map(c => `<category>${escapeXml(c)}</category>`).join('');
      const enclosure = resolveEnclosure(p.thumbnail_url, p.refined_content || '');
      const encXml = enclosure ? `<enclosure url="${escapeXml(enclosure.url)}" type="${escapeXml(enclosure.type)}" length="${enclosure.length}"/>` : '';
      return `<item><title>${title}</title><link>${escapeXml(url)}</link><guid>${escapeXml(url)}</guid><pubDate>${pubDate}</pubDate><description>${desc}</description>${catXml}${encXml}<lastBuildDate>${updated}</lastBuildDate></item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>InsureLog</title><link>${escapeXml(SITE_URL)}</link><description>AI, 기술, 보험 관련 글</description>${items}</channel></rss>`;
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (e) {
    res.status(500).send('RSS generation failed: ' + (e?.message || e));
  }
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractTagsFromHTML(refined = '') {
  try {
    const html = String(refined || '');
    const m = html.match(/data-tags="([^"]+)"/);
    if (!m) return [];
    return m[1].split(',').map(s => s.trim()).filter(Boolean);
  } catch { return []; }
}

function resolveEnclosure(thumbnailUrl, refined = '') {
  const pickType = (url) => {
    const ext = (url || '').split('.').pop()?.toLowerCase() || '';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'avif') return 'image/avif';
    return 'image/jpeg';
  };
  if (thumbnailUrl) {
    return { url: thumbnailUrl, type: pickType(thumbnailUrl), length: 0 };
  }
  try {
    const html = String(refined || '');
    const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    const src = imgMatch?.[1];
    if (src) return { url: src, type: pickType(src), length: 0 };
  } catch { /* ignore */ }
  return null;
}