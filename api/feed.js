// This is a Vercel Serverless Function that will generate the RSS feed.
// It should be placed in the `api` directory of your project.

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://ddehwkwzmmvcxltlplua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZWh3a3d6bW12Y3hsdGxwbHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjcyNTgsImV4cCI6MjA3MjIwMzI1OH0.VNK-2RYRvLUr9f4fg59kQEEgjwUBZZQsQsrld9Zg7To';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_URL = 'https://blogaipandoci.vercel.app';
const BLOG_TITLE = 'InsureLog';
const BLOG_DESCRIPTION = 'AI, 기술, 그리고 보험에 대한 깊이 있는 인사이트를 탐험하는 공간';

export default async function handler(req, res) {
  try {
    // Fetch the latest 10 posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('title, summary, slug, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<rss version="2.0">`;
    xml += `<channel>`;
    xml += `<title>${BLOG_TITLE}</title>`;
    xml += `<link>${SITE_URL}</link>`;
    xml += `<description>${BLOG_DESCRIPTION}</description>`;
    xml += `<language>ko</language>`;
    
    posts.forEach(post => {
      xml += `
        <item>
          <title>${post.title}</title>
          <link>${SITE_URL}/post/${post.slug}</link>
          <guid>${SITE_URL}/post/${post.slug}</guid>
          <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
          <description><![CDATA[${post.summary}]]></description>
        </item>`;
    });

    xml += `</channel>`;
    xml += `</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
    res.status(200).send(xml);

  } catch (e) {
    console.error('RSS feed generation error:', e);
    res.status(500).json({ error: 'Error generating RSS feed' });
  }
}
