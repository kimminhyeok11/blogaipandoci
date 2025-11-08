const fs = require('fs-extra');
const path = require('path');

async function copyStaticFiles() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');

  // Ensure dist directory exists
  await fs.ensureDir(dist);

  // Files and directories to copy
  const assets = [
    'index.html',
    'css',
    'style.css',
    'js',
    'ads.txt',
    'robots.txt',
    'og-image.svg',
    'api' 
  ];

  for (const asset of assets) {
    const source = path.join(root, asset);
    const destination = path.join(dist, asset);
    if (fs.existsSync(source)) {
      await fs.copy(source, destination);
      console.log(`  ✓ Copied ${asset} to dist`);
    }
  }
  console.log('[copy-static] Done.');
}

copyStaticFiles().catch(e => { console.error(e); process.exit(1); });