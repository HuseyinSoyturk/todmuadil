import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const cssPath = path.join(rootDir, 'src/core/tv-styles.css');
const outDir = path.join(rootDir, 'dist');
const outFile = path.join(outDir, 'tod-xbox-live.bundle.js');

fs.mkdirSync(outDir, { recursive: true });
const cssText = fs.readFileSync(cssPath, 'utf8');

await build({
  entryPoints: [path.join(rootDir, 'src/index.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: outFile,
  banner: {
    js: `globalThis.__TOD_XBOX_INLINE_CSS__ = ${JSON.stringify(cssText)};`
  }
});

console.log(`Built bundle: ${outFile}`);
