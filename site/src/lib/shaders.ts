import { highlightFile } from './source-files';

export interface ShaderMeta {
  name: string;
  description: string;
  entry: string;
  files: string[];
}

const manifests = import.meta.glob('../../public/shaders/*/shader.json', { eager: true, import: 'default' });
export const shaders = (Object.values(manifests) as ShaderMeta[]).sort((a, b) => a.name.localeCompare(b.name));
const sources = import.meta.glob('../../public/shaders/**/*.{html,js,css,json,glsl,frag,vert}', { eager: true, query: '?raw', import: 'default' });

export function loadShaderFiles(shader: ShaderMeta) {
  return Promise.all(shader.files.map(name => {
    const code = sources[`../../public/shaders/${shader.name}/${name}`];
    if (typeof code !== 'string') throw new Error(`Missing shader source: ${shader.name}/${name}`);
    return highlightFile(name, code);
  }));
}
