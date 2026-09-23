import { extname } from 'node:path';

export interface Ref { start: number; end: number; value: string; kind: 'module'|'asset'; attribute?:string; }
export interface Prop {name:string; type:string; required:boolean; default?:string; description?:string}

// Offsets always refer to the original source, so rewrites never reprint user code.
export function scan(code:string, filename:string, runtime:any) {
 const {ts,vue,svelte,postcss,values}=runtime;
 const refs:Ref[]=[]; const scripts:any[]=[]; let scriptOffset:number|undefined;
 function js(text:string, offset=0) {
  const kind=/\.(?:[cm]?ts|vue|svelte)$/.test(filename)?ts.ScriptKind.TS:ts.ScriptKind.TSX;
  const sf=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true,kind);
  if(sf.parseDiagnostics.length)throw new Error(`Cannot parse ${filename}: ${ts.flattenDiagnosticMessageText(sf.parseDiagnostics[0].messageText,' ')}`);
  scripts.push(sf);
  function add(node:any,kind:Ref['kind']='module') {refs.push({start:offset+node.getStart(sf)+1,end:offset+node.end-1,value:node.text,kind});}
  function visit(n:any) {
   if ((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier) add(n.moduleSpecifier);
   if(ts.isImportTypeNode(n)&&ts.isLiteralTypeNode(n.argument)&&ts.isStringLiteral(n.argument.literal))add(n.argument.literal);
   if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(sf)==='require')) {
    if(n.arguments.length && ts.isStringLiteralLike(n.arguments[0])) add(n.arguments[0]);
    else throw new Error(`Computed import is not portable in ${filename}. Replace it with literal imports.`);
   }
   if(ts.isCallExpression(n)&&n.expression.getText(sf)==='import.meta.glob') throw new Error(`import.meta.glob is not supported in ${filename}; use explicit imports.`);
   if(ts.isNewExpression(n)&&n.expression.getText(sf)==='URL'&&n.arguments?.[1]?.getText(sf)==='import.meta.url') {
    if(ts.isStringLiteralLike(n.arguments[0]))add(n.arguments[0],'asset');
    else throw new Error(`Computed asset URL is not portable in ${filename}.`);
   }
   ts.forEachChild(n,visit);
  }
  visit(sf);
 }
 function css(text:string,offset=0) {
  const ast=postcss.parse(text,{from:filename});
  function parseValue(value:string,base:number,importRule=false) {
   const parsed=values(value);
   parsed.walk((n:any)=>{
    if(n.type==='function'&&n.value.toLowerCase()==='url') {
     const v=n.nodes.find((x:any)=>x.type==='word'||x.type==='string');if(!v)return false;
     const quoted=v.type==='string'?1:0;
     refs.push({start:base+v.sourceIndex+quoted,end:base+v.sourceEndIndex-quoted,value:v.value,kind:'asset'});return false;
    }
    if(importRule && n.type==='string' && n===parsed.nodes[0]) refs.push({start:base+n.sourceIndex+1,end:base+n.sourceEndIndex-1,value:n.value,kind:'asset'});
   });
  }
  ast.walkDecls((n:any)=>parseValue(n.value,offset+n.source.start.offset+n.prop.length+n.raws.between.length));
  ast.walkAtRules('import',(n:any)=>parseValue(n.params,offset+n.source.start.offset+1+n.name.length+n.raws.afterName.length,true));
 }
 const ext=extname(filename);
 if(ext==='.vue') {
  const result=vue.parse(code,{filename});if(result.errors.length)throw new Error(`Cannot parse ${filename}: ${result.errors.join(', ')}`);
  const d=result.descriptor;
  for(const b of [d.script,d.scriptSetup])if(b) {if(b.src)throw new Error(`External script src in ${filename} is not supported.`);js(b.content,b.loc.start.offset);}
  for(const b of d.styles) {if(b.src)throw new Error(`External style src in ${filename} is not supported.`);css(b.content,b.loc.start.offset);}
  if(d.template) {
   // The compiler's template AST exposes exact source locations for static attributes.
   const walk=(n:any)=>{
    for(const p of n.props??[])if(p.type===6&&['src','poster'].includes(p.name)&&p.value) {
     const v=p.value;const raw=v.loc.source;const quote=/^["']/.test(raw)?1:0;
     refs.push({start:v.loc.start.offset+quote,end:v.loc.end.offset-quote,value:v.content,kind:'asset'});
    }
    for(const c of n.children??[])walk(c);
   };
   if(d.template.ast)walk(d.template.ast);
  }
 } else if(ext==='.svelte') {
  const ast=svelte.parse(code,{modern:true});
  scriptOffset=ast.instance?.content.start;
  for(const b of [ast.instance,ast.module]) if(b)js(code.slice(b.content.start,b.content.end),b.content.start);
  if(ast.css)css(code.slice(ast.css.content.start,ast.css.content.end),ast.css.content.start);
  const walk=(n:any)=>{
   if(!n||typeof n!=='object')return;
   if(n.type==='Attribute'&&['src','poster'].includes(n.name)&&Array.isArray(n.value)&&n.value.length===1&&n.value[0].type==='Text') {
    const v=n.value[0];refs.push({start:n.start,end:n.end,value:v.data,kind:'asset',attribute:n.name});
   }
   for(const [k,v] of Object.entries(n))if(k!=='loc') {if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
  };walk(ast.fragment);
 } else if(/\.(css|scss|sass|less)$/.test(ext))css(code);
 else if(/\.[cm]?[jt]sx?$/.test(ext))js(code);
 return {refs:refs.filter((r,i,a)=>a.findIndex(x=>x.start===r.start)===i),scripts,scriptOffset};
}

export function documentProps(scripts:any[],ts:any,exportName='default'):Prop[] {
 const result=new Map<string,Prop>();const types=new Map<string,any>();const defaults=new Map<string,string>();
 for(const sf of scripts)for(const n of sf.statements) {
  if(ts.isInterfaceDeclaration(n)||ts.isTypeAliasDeclaration(n))types.set(n.name.text,n);
 }
 function members(type:any):any[] {
  if(!type)return [];
  if(ts.isTypeReferenceNode(type))return members(types.get(type.typeName.getText()));
  if(ts.isTypeAliasDeclaration(type))return members(type.type);
  if(ts.isIntersectionTypeNode(type))return type.types.flatMap(members);
  return type.members?[...type.members]:[];
 }
 function capture(type:any) { for(const m of members(type))if(m.name&&m.type) {
  const name=m.name.getText().replace(/^['"]|['"]$/g,'');
  result.set(name,{name,type:m.type.getText(),required:!m.questionToken,description:m.jsDoc?.map((d:any)=>typeof d.comment==='string'?d.comment:'').join(' ')||undefined});
 }}
 function bindings(n:any) {if(ts.isObjectBindingPattern(n))for(const b of n.elements)if(b.initializer)defaults.set((b.propertyName??b.name).getText(),b.initializer.getText());}
 for(const sf of scripts) {
  if(!/\.(vue|svelte)$/.test(sf.fileName)) {
   const declarations=new Map<string,any>();let selected:any;
   for(const n of sf.statements) {
    if(n.name&&ts.isIdentifier(n.name))declarations.set(n.name.text,n);
    if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(ts.isIdentifier(d.name))declarations.set(d.name.text,d);
    if(exportName==='default'&&n.modifiers?.some((m:any)=>m.kind===ts.SyntaxKind.DefaultKeyword))selected=n;
    if(exportName==='default'&&ts.isExportAssignment(n))selected=n.expression;
    if(ts.isExportDeclaration(n)&&!n.moduleSpecifier&&!n.isTypeOnly&&n.exportClause?.elements)for(const e of n.exportClause.elements)if(!e.isTypeOnly&&e.name.text===exportName)selected=e.propertyName??e.name;
   }
   selected??=declarations.get(exportName);
   const seen=new Set<any>();
   function component(n:any) {
    if(!n||seen.has(n))return;seen.add(n);
    if(ts.isIdentifier(n)){component(declarations.get(n.text));return;}
    if(ts.isParenthesizedExpression(n)||ts.isAsExpression(n)||ts.isSatisfiesExpression(n)){component(n.expression);return;}
    if(ts.isVariableDeclaration(n)) {
     if(n.type&&ts.isTypeReferenceNode(n.type)&&/(^|\.)(FC|Component|FunctionComponent)$/.test(n.type.typeName.getText()))capture(n.type.typeArguments?.[0]);
     component(n.initializer);return;
    }
    if(ts.isFunctionLike(n)) {const p=n.parameters?.[0];if(p){capture(p.type);bindings(p.name);}return;}
    if(ts.isCallExpression(n)&&/(^|\.)(memo|forwardRef)$/.test(n.expression.getText())) {
     if(/(^|\.)forwardRef$/.test(n.expression.getText()))capture(n.typeArguments?.[1]);
     component(n.arguments[0]);
    }
   }
   component(selected);continue;
  }
  function visit(n:any) {
   // Framework prop declarations live at module scope; helper parameters are not props.
   if(ts.isFunctionLike(n))return;
   if(ts.isCallExpression(n)&&n.expression.getText()==='defineProps')capture(n.typeArguments?.[0]);
   if(ts.isCallExpression(n)&&n.expression.getText()==='withDefaults'&&n.arguments[1]&&ts.isObjectLiteralExpression(n.arguments[1]))for(const p of n.arguments[1].properties)if(ts.isPropertyAssignment(p))defaults.set(p.name.getText().replace(/^['"]|['"]$/g,''),p.initializer.getText());
   if(ts.isVariableDeclaration(n)) {
    if(n.initializer&&ts.isCallExpression(n.initializer)&&n.initializer.expression.getText()==='$props'){capture(n.type);bindings(n.name);}
   }
   if(ts.isVariableStatement(n)&&n.modifiers?.some((m:any)=>m.kind===ts.SyntaxKind.ExportKeyword)&&n.declarationList.flags&ts.NodeFlags.Let)for(const d of n.declarationList.declarations) {
    const name=d.name.getText();result.set(name,{name,type:d.type?.getText()??(d.initializer?ts.isStringLiteralLike(d.initializer)?'string':d.initializer.kind===ts.SyntaxKind.NumericLiteral?'number':'unknown':'unknown'),required:!d.initializer,default:d.initializer?.getText()});
   }
   ts.forEachChild(n,visit);
  }visit(sf);
 }
 for(const [name,value] of defaults)if(result.has(name)){result.get(name)!.default=value;result.get(name)!.required=false;}
 return [...result.values()];
}

export function inferPreviewProps(scripts:any[],ts:any,props:Prop[]):Record<string,string> {
 const aliases=new Map<string,any>();
 for(const sf of scripts)for(const statement of sf.statements)
  if(ts.isTypeAliasDeclaration(statement))aliases.set(statement.name.text,statement.type);
 function literal(node:any,seen=new Set<string>()):string|undefined {
  if(ts.isParenthesizedTypeNode(node))return literal(node.type,seen);
  if(ts.isTypeReferenceNode(node)) {
   const name=node.typeName.getText();if(seen.has(name)||!aliases.has(name))return;
   seen.add(name);return literal(aliases.get(name),seen);
  }
  if(ts.isUnionTypeNode(node)) {
   if(!node.types.every((member:any)=>ts.isLiteralTypeNode(member)&&ts.isStringLiteral(member.literal)))return;
   return node.types[0].literal.text;
  }
  if(ts.isLiteralTypeNode(node)&&ts.isStringLiteral(node.literal))return node.literal.text;
 }
 const values:Record<string,string>={};
 for(const prop of props) {
  if(!prop.required)continue;
  const source=ts.createSourceFile('kuit-preview-prop.ts',`type PreviewProp = ${prop.type};`,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  if(source.parseDiagnostics.length)continue;
  const value=literal(source.statements[0].type);
  if(value!==undefined)values[prop.name]=value;
 }
 return values;
}
