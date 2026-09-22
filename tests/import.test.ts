import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(p => rm(p, {recursive:true, force:true}))); });
async function fixture(files: Record<string,string>) {
 const root = await mkdtemp(join(tmpdir(), 'kuit-test-')); dirs.push(root);
 for (const [name, code] of Object.entries({'package.json':'{"type":"module","dependencies":{"react":"^19.1.0"}}', ...files})) {
  await mkdir(join(root, name, '..'), {recursive:true}); await writeFile(join(root,name),code);
 }
 return root;
}
async function run(root: string, entry: string, framework='react', name='button', extra: string[]=[]) {
 return Bun.spawn(['bun',resolve('helper/index.ts'), '--origin',join(root,entry),'--framework',framework,'--name',name,'--target',root,'--runtime',resolve('site'),...extra], {stdout:'pipe',stderr:'pipe'});
}
test('copies nested imports and CSS assets, preserving npm imports and cycles', async () => {
 const root=await fixture({
  'src/button.tsx': 'import React from "react"; import {x} from "./utils"; import icon from "../assets/icon.svg"; import "./style.css"; export default function Button(){return <button>{x}<img src={icon}/></button>}',
  'src/utils.ts': 'export {x} from "./value";', 'src/value.ts':'import "./utils"; export const x=1;',
  'assets/icon.svg':'<svg/>', 'src/style.css':'button { background:url(../assets/icon.svg) }',
 });
 const p=await run(root,'src/button.tsx'); const err=await new Response(p.stderr).text(); expect(await p.exited,err).toBe(0);
 const code=await readFile(join(root,'react/button/button.tsx'),'utf8'); expect(code).toContain('"./icon.svg"'); expect(code).toContain('"react"');
 expect(await readFile(join(root,'react/button/style.css'),'utf8')).toContain('./icon.svg');
 const meta=JSON.parse(await readFile(join(root,'react/button/kuit.json'),'utf8')); expect(meta.schemaVersion).toBe(1); expect(meta.dependencies.react).toBe('^19.1.0'); expect(meta.files).toContain('value.ts');
 const page=await readFile(join(root,'src/pages/components/react/button/index.astro'),'utf8');
 const preview=await readFile(join(root,'src/pages/components/react/button/preview.astro'),'utf8');
 expect(page).toContain('components/ComponentPage.astro');
 expect(preview).toContain('react/button/button.tsx');
});
test('renames colliding basenames deterministically', async () => {
 const root=await fixture({'src/button.tsx':'import a from "../a/icon.svg"; import b from "../b/icon.svg"; export default ()=> <img src={a+b}/>;', 'a/icon.svg':'a','b/icon.svg':'b'});
 const p=await run(root,'src/button.tsx'); expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const meta=JSON.parse(await readFile(join(root,'react/button/kuit.json'),'utf8')); expect(meta.files.filter((x:string)=>x.endsWith('.svg')).length).toBe(2);
 const code=await readFile(join(root,'react/button/button.tsx'),'utf8'); expect(code.match(/\.\/icon[^"']*\.svg/g)?.[0]).not.toBe(code.match(/\.\/icon[^"']*\.svg/g)?.[1]);
});
test('missing dependency leaves no partial bundle', async () => {
 const root=await fixture({'button.tsx':'import x from "./missing"; export default x;'});
 const p=await run(root,'button.tsx'); expect(await p.exited).not.toBe(0); expect(await new Response(p.stderr).text()).toContain('missing'); expect(await Bun.file(join(root,'react/button/kuit.json')).exists()).toBe(false);
});
test('does not overwrite an existing bundle', async () => {
 const root=await fixture({'button.tsx':'export default ()=>null;', 'react/button/kuit.json':'keep me'});
 const p=await run(root,'button.tsx'); expect(await p.exited).not.toBe(0); expect(await readFile(join(root,'react/button/kuit.json'),'utf8')).toBe('keep me');
});
test('resolves tsconfig aliases and preserves query suffixes', async()=>{
 const root=await fixture({'tsconfig.json':'{"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}}}', 'button.tsx':'import {value} from "@/value"; import icon from "./icon.svg?raw"; export default ()=> <div>{value}{icon}</div>;', 'src/value.ts':'export const value=42;', 'icon.svg':'<svg/>'});
 const p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const code=await readFile(join(root,'react/button/button.tsx'),'utf8');expect(code).toContain('"./value.ts"');expect(code).toContain('"./icon.svg?raw"');
});
test('copies CSS imports and new URL assets', async()=>{
 const root=await fixture({'button.tsx':'import "./base.css"; const x=new URL("./icon.svg",import.meta.url);export default ()=> <img src={x.href}/>;', 'base.css':'@import "./theme.css"; button {background:url("./icon.svg")}', 'theme.css':':root{color:white}', 'icon.svg':'<svg/>'});
 const p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const css=await readFile(join(root,'react/button/base.css'),'utf8');expect(css).toContain('@import "./theme.css"');expect(css).toContain('url("./icon.svg")');
 expect(await Bun.file(join(root,'react/button/theme.css')).exists()).toBe(true);
});
test('rejects computed imports before publishing', async()=>{
 const root=await fixture({'button.tsx':'const name="x"; const x=import(`./${name}`); export default ()=>null;'});
 const p=await run(root,'button.tsx');expect(await p.exited).not.toBe(0);expect(await new Response(p.stderr).text()).toContain('Computed import');
});
test('retains imports after generic TypeScript functions',async()=>{
 const root=await fixture({'button.tsx':'import {identity} from "./util";export default ()=> <div>{identity(1)}</div>;', 'util.ts':'const id=<T>(x:T)=>x; import {value} from "./value";export const identity=id;', 'value.ts':'export const value=42;'});
 const p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);expect(await Bun.file(join(root,'react/button/value.ts')).exists()).toBe(true);
});
test('copies package imports aliases',async()=>{
 const root=await fixture({'package.json':'{"type":"module","imports":{"#value":"./value.ts"}}','button.tsx':'import {value} from "#value";export default ()=> <div>{value}</div>;', 'value.ts':'export const value=42;'});
 const p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);expect(await readFile(join(root,'react/button/button.tsx'),'utf8')).toContain('"./value.ts"');
});
test('documents Vue withDefaults values',async()=>{
 const root=await fixture({'button.vue':'<script setup lang="ts">interface Props { label?: string; disabled?: boolean };const props=withDefaults(defineProps<Props>(), {label:"Hello",disabled:false});</script><template><button>{{props.label}}</button></template>'});
 const p=await run(root,'button.vue','vue');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const meta=JSON.parse(await readFile(join(root,'vue/button/kuit.json'),'utf8'));expect(meta.props.find((p:any)=>p.name==='label').default).toBe('"Hello"');
});
test('selects the only runtime export while ignoring exported types',async()=>{
 const root=await fixture({'button.tsx':'export type Props={label?:string};export function Button(props:Props){return <button>{props.label}</button>}'});
 const p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const meta=JSON.parse(await readFile(join(root,'react/button/kuit.json'),'utf8'));expect(meta.export).toBe('Button');
});
test('rejects a requested default export when none exists',async()=>{
 const root=await fixture({'button.tsx':'export function Button(){return null}'});
 const p=await run(root,'button.tsx','react','button',['--export','default']);expect(await p.exited).not.toBe(0);expect(await new Response(p.stderr).text()).toContain('default');expect(await Bun.file(join(root,'react/button/kuit.json')).exists()).toBe(false);
});
test('documents only the selected component, not unrelated helpers',async()=>{
 const root=await fixture({'button.tsx':'export default function Button(props:{label:string}){return null} function helper({label=42}:{label?:number;internal:boolean}){return label}'});
 const p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);const meta=JSON.parse(await readFile(join(root,'react/button/kuit.json'),'utf8'));expect(meta.props).toEqual([{name:'label',type:'string',required:true}]);
});
for(const [label,code,selected] of [
 ['default identifier','const Button=({label="Hello"}:Props)=>null;export default Button;','default'],
 ['named alias','const Button=({label="Hello"}:Props)=>null;export {Button as Selected};','Selected'],
 ['FC annotation','const Button: React.FC<Props>=({label="Hello"})=>null;export default Button;','default'],
 ['memo wrapper','const Button=({label="Hello"}:Props)=>null;export default memo(Button);','default'],
 ['forwardRef wrapper','export default forwardRef<HTMLButtonElement,Props>(({label="Hello"},ref)=>null);','default'],
])test(`scopes props through ${label}`,async()=>{
 const root=await fixture({'button.tsx':`import React,{memo,forwardRef} from "react";type Props={label?:string};${code} function helper(props:{internal:boolean}){return null}`});
 const p=await run(root,'button.tsx','react','button',['--export',selected]);expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const meta=JSON.parse(await readFile(join(root,'react/button/kuit.json'),'utf8'));expect(meta.props).toEqual([{name:'label',type:'string',required:false,default:'"Hello"'}]);
});
for(const framework of ['vue','svelte'])test(`bundles static ${framework} asset attributes`,async()=>{
 const root=await fixture({['button.'+framework]:framework==='vue'?'<template><img src="./assets/icon.svg" /></template>':'<img src="./assets/icon.svg" alt=""/>','assets/icon.svg':'<svg/>'});
 const p=await run(root,'button.'+framework,framework);expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 expect(await Bun.file(join(root,framework,'button/icon.svg')).exists()).toBe(true);
 const code=await readFile(join(root,framework,'button/button.'+framework),'utf8');expect(code).not.toContain('./assets/icon.svg');
 if(framework==='svelte'){expect(code).toContain('import');expect(code).toContain('src={');}
});
test('force replaces generated bundle and removes stale files', async()=>{
 const root=await fixture({'button.tsx':'import "./old.css";export default ()=>null;', 'old.css':'body{}'});
 let p=await run(root,'button.tsx');expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 await writeFile(join(root,'button.tsx'),'export default ()=>null;');p=await run(root,'button.tsx','react','button',['--force']);expect(await p.exited,await new Response(p.stderr).text()).toBe(0);expect(await Bun.file(join(root,'react/button/old.css')).exists()).toBe(false);
});
for (const [framework,ext,code] of [
 ['vue','vue','<script setup lang="ts">import icon from "./icon.svg"; defineProps<{ label?: string }>();</script><template><img :src="icon" /></template>'],
 ['svelte','svelte','<script lang="ts">import icon from "./icon.svg"; let { label = "Hello" }: { label?: string } = $props();</script><img src={icon} alt={label}/>'],
 ['solid','tsx','import icon from "./icon.svg"; type Props={label?: string}; export default function Button(props:Props){return <img src={icon} alt={props.label}/>}'],
]) test(`imports ${framework} source and documents props`, async()=>{
 const root=await fixture({['button.'+ext]:code,'icon.svg':'<svg/>'}); const p=await run(root,'button.'+ext,framework);
 expect(await p.exited,await new Response(p.stderr).text()).toBe(0);
 const meta=JSON.parse(await readFile(join(root,framework,'button/kuit.json'),'utf8')); expect(meta.props.some((p:any)=>p.name==='label')).toBe(true);
});
