import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const globalCss = readFileSync(new URL('../site/src/styles/global.css', import.meta.url), 'utf8');
const previewCss = readFileSync(new URL('../site/src/styles/preview.css', import.meta.url), 'utf8');

test('global CSS contains only setup and OKLCH theme tokens', () => {
 const blocks = [...globalCss.matchAll(/(@theme(?: inline)?|\.dark)\s*\{([^}]*)\}/g)];
 expect(blocks.length).toBe(3);
 const tokens = blocks.flatMap(([, , body]) => [...body.matchAll(/--color-[\w-]+:\s*([^;]+);/g)]);
 expect(tokens.length).toBeGreaterThan(10);
 expect(tokens.every(([, value]) => /^oklch\(/.test(value))).toBe(true);
 expect(blocks.every(([, , body]) => body.trim().split('\n').every(line => !line.trim() || /^--color-[\w-]+:\s*oklch\([^;]+\);$/.test(line.trim())))).toBe(true);
 const setup = globalCss.replace(/(@theme(?: inline)?|\.dark)\s*\{[^}]*\}/g, '').trim().split('\n').map(line => line.trim()).filter(Boolean);
 expect(setup.every(line => /^@(import|source)\s/.test(line))).toBe(true);
 expect(globalCss).not.toContain('!important');
 expect(globalCss).not.toMatch(/#[\da-f]{3,8}\b/i);
 expect(previewCss.trim()).toBe("@import './global.css';");
});
