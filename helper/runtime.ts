import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadRuntime(target: string) {
 const require = createRequire(join(target, 'package.json'));
 try {
  return {
   ts: require('typescript'),
   postcss: require('postcss'),
   values: require('postcss-value-parser'),
   vue: require('@vue/compiler-sfc'),
   svelte: require('svelte/compiler'),
   vite: await import(pathToFileURL(join(dirname(require.resolve('vite/package.json')),'dist/node/index.js')).href),
  };
 } catch (cause) { throw new Error(`Viewer dependencies are missing. Run bun install in ${target}.`, {cause}); }
}
