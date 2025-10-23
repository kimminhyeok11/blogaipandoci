// api/robots.js
export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: https://blogaipandoci.vercel.app/sitemap.xml`);
}