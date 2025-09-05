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

// FIX: Function to escape special XML characters to prevent feed errors.
const escapeXml = (unsafe) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
};

export default async function handler(req, res) {
  try {
    // Fetch the latest 10 published posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('title, summary, slug, created_at, updated_at')
      .eq('status', 'published') // ADDED: Only fetch published posts
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`; // Added Atom namespace
    xml += `<channel>`;
    xml += `<title>${escapeXml(BLOG_TITLE)}</title>`;
    xml += `<link>${SITE_URL}</link>`;
    xml += `<description>${escapeXml(BLOG_DESCRIPTION)}</description>`;
    xml += `<language>ko</language>`;
    xml += `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;
    xml += `<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />`;
    
    posts.forEach(post => {
      const lastModified = post.updated_at || post.created_at;
      xml += `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${SITE_URL}/post/${post.slug}</link>
          <guid isPermaLink="true">${SITE_URL}/post/${post.slug}</guid>
          <pubDate>${new Date(lastModified).toUTCString()}</pubDate>
          <description><![CDATA[${post.summary}]]></description>
        </item>`;
    });

    xml += `</channel>`;
    xml += `</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
    res.status(200).send(xml);

  } catch (e) {
    console.error('RSS feed generation error:', e);
    res.status(500).json({ error: 'Error generating RSS feed' });
  }
}