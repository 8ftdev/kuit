import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const globalCss = readFileSync(new URL('../site/src/styles/global.css', import.meta.url), 'utf8');
const previewCss = readFileSync(new URL('../site/src/styles/preview.css', import.meta.url), 'utf8');

test('global CSS is limited to Tailwind/Fumadocs setup and OKLCH theme tokens', () => {
 const theme = globalCss.match(/@theme inline\s*\{([^}]*)\}/);
 expect(theme).not.toBeNull();
 const tokens = [...theme![1].matchAll(/--color-[\w-]+:\s*([^;]+);/g)];
 expect(tokens.length).toBeGreaterThan(10);
 expect(tokens.every(([, value]) => /^oklch\(/.test(value))).toBe(true);
 const setup = globalCss.replace(theme![0], '').trim().split('\n').map(line => line.trim()).filter(Boolean);
 expect(setup.every(line => /^@(import|source)\s/.test(line))).toBe(true);
 expect(globalCss).not.toContain('!important');
 expect(globalCss).not.toMatch(/#[\da-f]{3,8}\b/i);
 expect(previewCss.trim()).toBe("@import './global.css';");
});
