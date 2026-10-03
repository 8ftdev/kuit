import { codeToTokens, type BundledLanguage } from 'shiki';

export async function highlightFile(name: string, code: string | null) {
  const extension = name.split('.').pop()!;
  const lang = ({ svg: 'xml', mjs: 'js', cjs: 'js', mts: 'ts', cts: 'ts', glsl: 'glsl', frag: 'glsl', vert: 'glsl' } as Record<string, string>)[extension] ?? extension;
  const syntax = (['tsx', 'ts', 'jsx', 'js', 'vue', 'svelte', 'css', 'scss', 'less', 'json', 'xml', 'html', 'glsl', 'md'].includes(lang) ? lang : 'text') as BundledLanguage;
  const tokens = code === null ? null : (await codeToTokens(code, { lang: syntax, theme: 'github-dark' })).tokens.map(line => line.map(token => ({ content: token.content, color: token.color })));
  return { name, code, tokens };
}
