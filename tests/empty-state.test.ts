import { expect, test } from 'bun:test';
import { cp, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const source = resolve('site');
const frameworks = new Set(['react', 'vue', 'svelte', 'solid']);

test('a viewer with no imports shows useful empty states on every section', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kuit-empty-'));
  try {
    await cp(source, root, {
      recursive: true,
      filter: path => {
        if (['node_modules', '.astro', 'dist'].includes(basename(path))) return false;
        if (dirname(path) === source && frameworks.has(basename(path))) return false;
        if (dirname(path) === join(source, 'src/pages/components') && frameworks.has(basename(path))) return false;
        return true;
      },
    });
    await symlink(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
    const build = Bun.spawn(['bun', 'run', 'build'], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
    const output = await new Response(build.stderr).text();
    expect(await build.exited, output).toBe(0);

    const home = await readFile(join(root, 'dist/index.html'), 'utf8');
    const components = await readFile(join(root, 'dist/components/index.html'), 'utf8');
    const tools = await readFile(join(root, 'dist/tools/index.html'), 'utf8');
    const snippets = await readFile(join(root, 'dist/snippets/index.html'), 'utf8');

    expect(home).toContain('Soon');
    expect(components).toContain('No components yet');
    expect(components).toContain('kuit ./src/button.tsx react');
    for (const [framework, label, extension] of [
      ['react', 'React', 'tsx'],
      ['vue', 'Vue', 'vue'],
      ['svelte', 'Svelte', 'svelte'],
      ['solid', 'Solid', 'tsx'],
    ]) {
      const page = await readFile(join(root, `dist/components/${framework}/index.html`), 'utf8');
      expect(components).toContain(`/components/${framework}/`);
      expect(page).toContain(`No ${label} components yet`);
      expect(page).toContain(`kuit ./src/button.${extension} ${framework}`);
    }
    expect(tools).toContain('No web tools yet');
    expect(tools).toContain('Browse components');
    expect(snippets).toContain('No snippets yet');
    expect(snippets).toContain('Browse components');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
