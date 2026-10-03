import { highlightFile } from './source-files';

export interface ComponentMeta {
 schemaVersion?:1; name:string; framework:string; entry:string; export:string; files:string[];
 dependencies:Record<string,string>;
 props:{name:string;type:string;required:boolean;default?:string;description?:string}[];
}
const manifests=import.meta.glob('../../{react,vue,svelte,solid}/*/kuit.json',{eager:true,import:'default'});
export const components=Object.values(manifests) as ComponentMeta[];
export const frameworkNames:Record<string,string>={react:'React',vue:'Vue',svelte:'Svelte',solid:'Solid'};
export const title=(name:string)=>name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ');
const sources=import.meta.glob('../../{react,vue,svelte,solid}/**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,vue,svelte,css,scss,less,json,svg,txt,md}',{eager:true,query:'?raw',import:'default'});
export async function loadFiles(meta:ComponentMeta) {
 return Promise.all(meta.files.map(async name=>{
  const code=(sources[`../../${meta.framework}/${meta.name}/${name}`] as string|undefined)??null;
  return highlightFile(name,code);
 }));
}
