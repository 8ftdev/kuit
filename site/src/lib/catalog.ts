import { codeToTokens, type BundledLanguage } from 'shiki';

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
  const ext=name.split('.').pop()!;const lang=({svg:'xml',mjs:'js',cjs:'js',mts:'ts',cts:'ts'} as Record<string,string>)[ext]??ext;
  const syntax=(['tsx','ts','jsx','js','vue','svelte','css','scss','less','json','xml','md'].includes(lang)?lang:'text') as BundledLanguage;
  const tokens=code===null?null:(await codeToTokens(code,{lang:syntax,theme:'github-dark'})).tokens.map(line=>line.map(t=>({content:t.content,color:t.color})));
  return {name,code,tokens};
 }));
}
