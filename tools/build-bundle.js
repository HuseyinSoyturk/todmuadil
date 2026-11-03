import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const rootDir = path.resolve(import.meta.dirname, '..');
const cssPath = path.join(rootDir, 'src/core/tv-styles.css');
const outDir = path.join(rootDir, 'dist');
const outFile = path.join(outDir, 'tod-xbox-live.bundle.js');

fs.mkdirSync(outDir, { recursive: true });
const cssText = fs.readFileSync(cssPath, 'utf8');

const polyfillBanner = [
  'if(typeof window!=="undefined"&&typeof window.globalThis==="undefined"){window.globalThis=window;}',
  'if(!String.prototype.replaceAll){String.prototype.replaceAll=function(s,r){return this.split(s).join(r);};}',
  'if(typeof Promise!=="undefined"&&!Promise.prototype.finally){Promise.prototype.finally=function(cb){var P=this.constructor;return this.then(function(v){return P.resolve(cb()).then(function(){return v;});},function(e){return P.resolve(cb()).then(function(){throw e;});});};}',
  `window.__TOD_XBOX_INLINE_CSS__=${JSON.stringify(cssText)};`
].join('');

await build({
  entryPoints: [path.join(rootDir, 'src/index.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2017'],
  outfile: outFile,
  banner: {
    js: polyfillBanner
  }
});

console.log(`Built bundle: ${outFile}`);
