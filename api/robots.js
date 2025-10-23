// This is a Vercel Serverless Function that generates robots.txt.
// It should be placed in the `api` directory of your project.
// Includes sitemap reference for better SEO.

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

# Sitemap
Sitemap: https://blogaipandoci.vercel.app/sitemap.xml

# Allow search engines to crawl everything
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Block AI scrapers if needed (optional)
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /`);
  res.status(200).end();
}