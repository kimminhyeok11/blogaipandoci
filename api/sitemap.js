// This is a Vercel Serverless Function that will generate the sitemap.
// It should be placed in the `api` directory of your project.

// We need to import the Supabase client to fetch posts.
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://ddehwkwzmmvcxltlplua.supabase.co';
// CORRECTED: The original key had a typo ("JIJI") in the header part.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZWh3a3d6bW12Y3hsdGxwbHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjcyNTgsImV4cCI6MjA3MjIwMzI1OH0.VNK-2RYRvLUr9f4fg59kQEEgjwUBZZQsQsrld9Zg7To';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_URL = 'https://blogaipandoci.vercel.app';

export default async function handler(req, res) {
  try {
    // Fetch all published posts from Supabase (이미지 포함)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at, created_at, thumbnail_url')
      .eq('status', 'published') // Only include published posts
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    
    // Start building the XML string with image namespace
    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Add the homepage URL
    xml += `
      <url>
        <loc>${SITE_URL}/</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.00</priority>
      </url>`;

    // Add each post URL
    posts.forEach(post => {
      // Use updated_at if available, otherwise fallback to created_at
      const lastModified = post.updated_at || post.created_at;
      xml += `
        <url>
          <loc>${SITE_URL}/post/${post.slug}</loc>
          <lastmod>${new Date(lastModified).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.80</priority>`;
      
      // Add image tag if thumbnail exists (SEO for images)
      if (post.thumbnail_url) {
        xml += `
          <image:image>
            <image:loc>${post.thumbnail_url}</image:loc>
            <image:title>${post.title}</image:title>
            <image:caption>${post.summary || ''}</image:caption>
          </image:image>`;
      }
      
      xml += `
        </url>`;
    });

    xml += `</urlset>`;

    // Set headers and send the response
    res.setHeader('Content-Type', 'text/xml');
    // Cache for 1 hour on the edge, and allow stale content to be served while revalidating
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
    res.status(200).send(xml);

  } catch (e) {
    console.error('Sitemap generation error:', e);
    res.status(500).json({ error: 'Error generating sitemap' });
  }
}