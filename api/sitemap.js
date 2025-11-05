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
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('posts')
      .select('slug, updated_at, status')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(5000);
    if (error) throw error;
    const urls = (data || []).map(p => {
      const loc = `${SITE_URL}/post/${p.slug}`;
      const lastmod = new Date(p.updated_at || Date.now()).toISOString();
      return `<url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`;
    }).join('');
    const now = new Date().toISOString();
    const base = `<url><loc>${escapeXml(SITE_URL)}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`;
    const archives = `<url><loc>${escapeXml(SITE_URL + '/archives')}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${base}${archives}${urls}</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (e) {
    res.status(500).send('Sitemap generation failed: ' + (e?.message || e));
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