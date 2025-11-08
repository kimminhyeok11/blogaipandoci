// Bundle core JS into a single app.bundle(.min).js using esbuild
// Usage: node scripts/build-bundle.js

const fs = require('fs');
const path = require('path');

async function run() {
  const root = path.resolve(__dirname, '..');
  const outDir = path.resolve(root, 'dist'); // emit to project root for simple absolute path '/app.bundle.js'
  let esbuild;
  try {
    esbuild = require('esbuild');
  } catch (e) {
    console.error('[build-bundle] esbuild not installed. Please add it to dependencies.');
    process.exit(1);
  }

  const entry = path.join(__dirname, 'bundle-entry.js');
  if (!fs.existsSync(entry)) {
    console.error('[build-bundle] Missing bundle entry at scripts/bundle-entry.js');
    process.exit(1);
  }

  // Non-minified bundle
  const outFile = path.join(outDir, 'app.bundle.js');
  console.log('[build-bundle] Building app.bundle.js ...');
  await esbuild.build({
    entryPoints: [entry],
    outfile: outFile,
    bundle: true,
    minify: false,
    sourcemap: false,
    target: ['es2018'],
    legalComments: 'none',
    format: 'iife',
  });
  const size1 = fs.statSync(outFile).size;
  console.log(`  ✓ app.bundle.js (${Math.round(size1/1024*10)/10} KiB)`);

  // Minified bundle
  const outMin = path.join(outDir, 'app.bundle.min.js');
  console.log('[build-bundle] Building app.bundle.min.js ...');
  await esbuild.build({
    entryPoints: [entry],
    outfile: outMin,
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['es2018'],
    legalComments: 'none',
    format: 'iife',
  });
  const size2 = fs.statSync(outMin).size;
  console.log(`  ✓ app.bundle.min.js (${Math.round(size2/1024*10)/10} KiB)`);

  console.log('[build-bundle] Done.');
}

run().catch(e => { console.error(e); process.exit(1); });