// Minify all JS files in /js into .min.js using esbuild
// Usage: node scripts/build-minify.js

const fs = require('fs');
const path = require('path');

async function run() {
  const root = path.resolve(__dirname, '..');
  const jsDir = path.join(root, 'js');
  let esbuild;
  try {
    esbuild = require('esbuild');
  } catch (e) {
    console.error('[build-minify] esbuild not installed. Please add it to dependencies.');
    process.exit(1);
  }

  const files = fs.readdirSync(jsDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));

  if (files.length === 0) {
    console.log('[build-minify] No JS files found to minify.');
    return;
  }

  console.log(`[build-minify] Minifying ${files.length} files...`);
  for (const f of files) {
    const src = path.join(jsDir, f);
    const out = path.join(jsDir, f.replace(/\.js$/, '.min.js'));
    try {
      await esbuild.build({
        entryPoints: [src],
        outfile: out,
        minify: true,
        bundle: false,
        sourcemap: false,
        legalComments: 'none',
        target: ['es2018']
      });
      const before = fs.statSync(src).size;
      const after = fs.statSync(out).size;
      const saved = Math.max(0, before - after);
      console.log(`  ✓ ${f} → ${path.basename(out)} (-${Math.round(saved/1024*10)/10} KiB)`);
    } catch (e) {
      console.error(`  ✗ Failed to minify ${f}:`, e && e.message ? e.message : e);
    }
  }
  console.log('[build-minify] Done.');
}

run().catch(e => { console.error(e); process.exit(1); });