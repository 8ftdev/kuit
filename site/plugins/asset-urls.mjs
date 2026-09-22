import ts from 'typescript';

// Imported Vite components expect image imports to be strings. Astro's image
// metadata objects are useful elsewhere, so adapt only the collected bundles.
export function viteAssetURLs(root) {
 return {
  name:'kuit:asset-urls', enforce:'post',
  configResolved(config) { root=config.root.replace(/\\/g,'/').replace(/\/$/,'')+'/'; },
  transform(code,id) {
   if(!['react/','vue/','svelte/','solid/'].some(folder=>id.startsWith(root+folder))||/[?&](raw|url)(?:[=&]|$)/.test(id)||! /\.(?:[jt]sx?|vue|svelte)(?:\?|$)/.test(id)||/[?&]type=style/.test(id))return;
   const sf=ts.createSourceFile(id,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
   for(const statement of sf.statements) {
    if(!(ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement)))continue;
    const spec=statement.moduleSpecifier;
    if(spec&&ts.isStringLiteral(spec)&&/\.(svg|png|jpe?g|gif|webp|avif|ico|bmp|tiff?)$/i.test(spec.text))edits.push({start:spec.getStart(sf),end:spec.end,text:JSON.stringify(spec.text+'?url')});
   }
   if(!edits.length)return;
   for(const edit of edits.reverse())code=code.slice(0,edit.start)+edit.text+code.slice(edit.end);
   return {code,map:null};
  },
 };
}
