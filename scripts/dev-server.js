// Minimal static file server for local preview
// Usage: node scripts/dev-server.js [port]
// Defaults to 8094

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || 8094);
const ROOT = path.resolve(__dirname, '..');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function safePath(urlPath) {
  try {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const p = path.normalize(decoded).replace(/^\/+/, '');
    const full = path.join(ROOT, p || 'index.html');
    if (!full.startsWith(ROOT)) return null; // path traversal guard
    return full;
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url || '/');
  if (!filePath) return send(res, 400, { 'Content-Type': 'text/plain' }, 'Bad Request');
  let target = filePath;
  try {
    const stat = fs.existsSync(target) && fs.statSync(target);
    if (stat && stat.isDirectory()) {
      const indexPath = path.join(target, 'index.html');
      if (fs.existsSync(indexPath)) {
        target = indexPath;
      } else {
        const listing = fs.readdirSync(target).map(n => `<li><a href="${path.join(req.url, n)}">${n}</a></li>`).join('');
        const html = `<!doctype html><meta charset="utf-8"><ul>${listing}</ul>`;
        return send(res, 200, { 'Content-Type': 'text/html; charset=utf-8' }, html);
      }
    }
    if (!fs.existsSync(target)) {
      return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
    }
    const ext = path.extname(target).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(target);
    res.writeHead(200, { 'Content-Type': type });
    stream.pipe(res);
  } catch (e) {
    return send(res, 500, { 'Content-Type': 'text/plain' }, 'Internal Server Error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev] Static server running at http://127.0.0.1:${PORT}/`);
});