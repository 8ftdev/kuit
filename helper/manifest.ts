import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const frameworks = new Set(['react', 'vue', 'svelte', 'solid']);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const filename = /^[a-zA-Z0-9_.-]+$/;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export async function validateManifest(value: unknown, bundle: string): Promise<void> {
  if (!record(value)) throw new Error('Invalid kuit.json: expected an object.');
  if (value.schemaVersion !== 1) throw new Error('Invalid kuit.json: unsupported schemaVersion.');
  if (typeof value.name !== 'string' || !slug.test(value.name)) throw new Error('Invalid kuit.json: invalid name.');
  if (typeof value.framework !== 'string' || !frameworks.has(value.framework)) throw new Error('Invalid kuit.json: invalid framework.');
  if (typeof value.entry !== 'string' || !filename.test(value.entry) || value.entry === '.' || value.entry === '..') throw new Error('Invalid kuit.json: invalid entry.');
  if (typeof value.export !== 'string' || (value.export !== 'default' && !/^[A-Za-z_$][\w$]*$/.test(value.export))) throw new Error('Invalid kuit.json: invalid export.');
  if (!Array.isArray(value.files) || !value.files.length || value.files.some(file => typeof file !== 'string' || !filename.test(file) || file === '.' || file === '..')) throw new Error('Invalid kuit.json: invalid files.');
  const files = value.files as string[];
  if (new Set(files).size !== files.length) throw new Error('Invalid kuit.json: duplicate files.');
  if (!files.includes(value.entry)) throw new Error('Invalid kuit.json: entry is not in files.');
  if (!record(value.dependencies) || Object.entries(value.dependencies).some(([name, version]) => !name || typeof version !== 'string' || !version)) throw new Error('Invalid kuit.json: invalid dependencies.');
  if (!Array.isArray(value.props) || value.props.some(prop => !record(prop) || typeof prop.name !== 'string' || !prop.name || typeof prop.type !== 'string' || !prop.type || typeof prop.required !== 'boolean' || (prop.default !== undefined && typeof prop.default !== 'string') || (prop.description !== undefined && typeof prop.description !== 'string'))) throw new Error('Invalid kuit.json: invalid props.');

  const staged = await readdir(bundle);
  for (const file of files) {
    if (!staged.includes(file)) throw new Error(`Invalid kuit.json: missing bundled file ${file}.`);
    if (!(await stat(join(bundle, file))).isFile()) throw new Error(`Invalid kuit.json: ${file} is not a file.`);
  }
  if (staged.length !== files.length) throw new Error('Invalid kuit.json: unlisted files in staged bundle.');
}
