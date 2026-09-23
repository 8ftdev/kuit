import { expect, test } from 'bun:test';
import { renderHomebrewFormula } from '../scripts/homebrew-formula.ts';

const version = '0.1.0-rc.2';
const platforms = ['darwin_arm64', 'darwin_amd64', 'linux_arm64', 'linux_amd64'];
const checksums = platforms.map((platform, index) => `${String(index + 1).repeat(64)}  kuit_${version}_${platform}.tar.gz`).join('\n');

test('renders all release archives and their exact checksums', () => {
 const formula = renderHomebrewFormula('v0.1.0-rc.2', checksums);
 for (const [index, platform] of platforms.entries()) {
  expect(formula).toContain(`kuit_${version}_${platform}.tar.gz`);
  expect(formula).toContain(`sha256 "${String(index + 1).repeat(64)}"`);
 }
 expect(formula).toContain('bin.install "kuit"');
 expect(formula).toContain('shell_output("#{bin}/kuit --help")');
});

test('refuses missing or duplicate archive hashes', () => {
 expect(() => renderHomebrewFormula('v0.1.0-rc.2', checksums.split('\n').slice(0, 3).join('\n'))).toThrow('linux_amd64');
 expect(() => renderHomebrewFormula('v0.1.0-rc.2', `${checksums}\n${checksums.split('\n')[0]}`)).toThrow('Duplicate');
});

test('rejects malformed tags and hashes', () => {
 expect(() => renderHomebrewFormula('rc.2', checksums)).toThrow('tag');
 expect(() => renderHomebrewFormula('v0.1.0-rc.2', checksums.replace('1'.repeat(64), 'bad'))).toThrow('checksum');
});
