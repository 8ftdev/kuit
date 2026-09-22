import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vue from '@astrojs/vue';
import svelte from '@astrojs/svelte';
import solid from '@astrojs/solid-js';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { viteAssetURLs } from './plugins/asset-urls.mjs';

// Vite components expect image imports to be URLs. Astro normally returns
// ImageMetadata instead, so preserve Vite semantics for copied bundles only.
const bundleRoot=fileURLToPath(new URL('.',import.meta.url));
const assetURLs=viteAssetURLs(bundleRoot);

export default defineConfig({
 integrations: [
  react({ include: ['**/react/**', '**/src/components/**'] }),
  solid({ include: ['**/solid/**'] }),
  vue(), svelte(),
 ],
 vite: {
  plugins: [assetURLs,tailwind()],
  // This package's CommonJS main points to a missing file; bundle its ESM entry for SSR.
  ssr:{noExternal:['@lineiconshq/react-lineicons']},
 },
 devToolbar:{enabled:false},
});
