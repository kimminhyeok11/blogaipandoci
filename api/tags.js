export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('posts')
      .select('tags, updated_at, created_at, status')
      .eq('status', 'published')
      .limit(1000);
    if (error) throw error;
    const counts = new Map();
    for (const row of (data || [])) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      for (const t of tags) {
        const key = String(t || '').trim().toLowerCase();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const list = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    res.status(200).json({ tags: list });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
}