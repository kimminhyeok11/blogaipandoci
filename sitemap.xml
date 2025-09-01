// This is a Vercel Serverless Function that will generate the sitemap.
// It should be placed in the `api` directory of your project.

// We need to import the Supabase client to fetch posts.
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://ddehwkwzmmvcxltlplua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZWh3a3d6bW12Y3hsdGxwbHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjcyNTgsImV4cCI6MjA3MjIwMzI1OH0.VNK-2RYRvLUr9f4fg59kQEEgjwUBZZQsQsrld9Zg7To';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_URL = 'https://blogaipandoci.vercel.app';

export default async function handler(req, res) {
  try {
    // Fetch all posts from Supabase
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    
    // Start building the XML string
    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add the homepage URL
    xml += `
      <url>
        <loc>${SITE_URL}/</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>1.00</priority>
      </url>`;

    // Add each post URL
    posts.forEach(post => {
      xml += `
        <url>
          <loc>${SITE_URL}/post/${post.slug}</loc>
          <lastmod>${new Date(post.created_at).toISOString()}</lastmod>
          <priority>0.80</priority>
        </url>`;
    });

    xml += `</urlset>`;

    // Set headers and send the response
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
    res.status(200).send(xml);

  } catch (e) {
    console.error('Sitemap generation error:', e);
    res.status(500).json({ error: 'Error generating sitemap' });
  }
}
