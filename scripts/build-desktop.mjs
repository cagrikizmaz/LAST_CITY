import { build } from 'esbuild';
import { cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'desktop-build');
await mkdir(output, { recursive: true });
await build({ entryPoints: [resolve(root, 'desktop/main.ts')], outfile: resolve(output, 'main.cjs'),
  bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: ['electron', 'bufferutil', 'utf-8-validate'] });
const webOutput = resolve(output, 'web');
if (relative(root, webOutput).replaceAll('\\', '/') !== 'desktop-build/web') throw new Error('Invalid desktop output path');
await rm(webOutput, { recursive: true, force: true });
await cp(resolve(root, 'dist'), webOutput, { recursive: true });
await cp(resolve(root, 'desktop/preload.cjs'), resolve(output, 'preload.cjs'));
await writeFile(resolve(output, 'package.json'), JSON.stringify({ name: 'farming', productName: 'Farming', version: '1.2.0',
  description: 'Farming - local network farming and trading', author: 'Farming', main: 'main.cjs' }, null, 2));
console.log('Windows application prepared.');
