import { expect, test } from 'bun:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest } from '../helper/manifest.ts';

const manifest = {
  schemaVersion: 1,
  name: 'button',
  framework: 'react',
  entry: 'button.tsx',
  export: 'default',
  files: ['button.tsx', 'icon.svg'],
  dependencies: { react: '^19.1.0' },
  props: [],
};

test('accepts a complete staged component bundle', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kuit-manifest-'));
  try {
    await writeFile(join(dir, 'button.tsx'), 'export default function Button() {}');
    await writeFile(join(dir, 'icon.svg'), '<svg/>');
    await validateManifest(manifest, dir);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects a manifest that references a missing bundled file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kuit-manifest-'));
  try {
    await writeFile(join(dir, 'button.tsx'), 'export default function Button() {}');
    await expect(validateManifest(manifest, dir)).rejects.toThrow('icon.svg');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects malformed or unsafe manifest entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kuit-manifest-'));
  try {
    await writeFile(join(dir, 'button.tsx'), 'export default function Button() {}');
    for (const invalid of [
      { ...manifest, schemaVersion: 2 },
      { ...manifest, entry: 'missing.tsx' },
      { ...manifest, files: ['button.tsx', '../outside.tsx'] },
      { ...manifest, files: ['button.tsx', 'button.tsx'] },
      { ...manifest, dependencies: { react: 19 } },
    ]) await expect(validateManifest(invalid, dir)).rejects.toThrow();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
