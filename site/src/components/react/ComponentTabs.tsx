import { useState } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/astro';
import { MagneticTabs } from '../ruixen/magnetic-tabs';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import Icon from './Icon';
import type { ComponentMeta } from '../../lib/catalog';

type SourceFile = {
 name: string;
 code: string | null;
 tokens: { content: string; color?: string }[][] | null;
};

type Props = { meta: ComponentMeta; files: SourceFile[]; pathname: string };

const panel = 'overflow-hidden rounded-lg border border-border';
const panelHeight = 'h-112 sm:h-136';

export default function ComponentTabs({ meta, files, pathname }: Props) {
 const [tab, setTab] = useState('preview');
 const [filename, setFilename] = useState(meta.entry);
 const [revision, setRevision] = useState(0);
 const file = files.find((item) => item.name === filename) ?? files[0];
 const preview = `/components/${meta.framework}/${meta.name}/preview/`;
 const highlighted = <Pre className="shrink-0 whitespace-pre text-xs leading-6 [tab-size:2]"><code>{file?.tokens?.map((line, i) => <span className="line min-h-6 shrink-0" key={i}>{line.map((token, j) => <span key={j} style={{ color: token.color }}>{token.content}</span>)}{i < file.tokens!.length - 1 ? '\n' : ''}</span>)}</code></Pre>;

 return <RootProvider pathname={pathname} theme={{ enabled: false }} search={{ enabled: false }}>
  <div>
   <MagneticTabs id="component" defaultValue="preview" sound={false} onChange={setTab} className="mb-2.5" items={[{ value: 'preview', label: 'Preview' }, { value: 'code', label: 'Code' }, { value: 'props', label: 'Props' }]} />
   <div role="tabpanel" id="component-panel-preview" aria-labelledby="component-tab-preview" hidden={tab !== 'preview'} className={`${panel} ${panelHeight} bg-card ${tab === 'preview' ? 'flex flex-col' : 'hidden'}`}>
    <div className="flex shrink-0 items-center justify-between px-4 pt-4 text-sm sm:px-7 sm:pt-7"><span>Default</span><div className="flex gap-1.5"><button type="button" title="Reload preview" aria-label="Reload preview" onClick={() => setRevision(value => value + 1)} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><Icon name="reload" size={15} /></button><a href={preview} target="_blank" rel="noreferrer" title="Open preview" aria-label="Open preview in new tab" className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><Icon name="external" size={15} /></a></div></div>
    <iframe key={revision} src={preview} title={`${meta.name} live preview`} className="min-h-0 w-full flex-1 border-0" />
   </div>
   <div role="tabpanel" id="component-panel-code" aria-labelledby="component-tab-code" hidden={tab !== 'code'} className={`${panel} ${panelHeight} bg-background ${tab === 'code' ? 'flex flex-col' : 'hidden'}`}>
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground"><label htmlFor="source-file">File</label><select id="source-file" value={filename} onChange={event => setFilename(event.target.value)} className="max-w-[70%] rounded-md border border-input bg-card px-2.5 py-1.5 font-mono text-foreground">{files.map(item => <option key={item.name}>{item.name}</option>)}</select><span className="ml-auto whitespace-nowrap">{files.length} {files.length === 1 ? 'file' : 'files'}</span></div>
    {file?.code !== null ? <CodeBlock key={file?.name} title={file?.name} data-line-numbers allowCopy className="my-0 flex min-h-0 flex-1 flex-col rounded-none border-0 bg-card shadow-none [&>div:first-child]:shrink-0" viewportProps={{ className: 'min-h-0 max-h-none flex-1 overflow-auto', 'aria-label': `${file?.name} source code` }}>{highlighted}</CodeBlock> : <p className="p-8 text-sm text-muted-foreground">Binary asset included in this component’s folder.</p>}
   </div>
   <div role="tabpanel" id="component-panel-props" aria-labelledby="component-tab-props" hidden={tab !== 'props'} className={`${panel} bg-background ${tab === 'props' ? 'block' : 'hidden'}`}>
    {meta.props.length ? <div className="max-h-140 overflow-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{['Prop', 'Type', 'Default', 'Description'].map(heading => <th key={heading} className="border-b border-border bg-card px-4 py-4 font-medium text-muted-foreground sm:px-5">{heading}</th>)}</tr></thead><tbody>{meta.props.map(prop => <tr key={prop.name}><td className="border-b border-border px-4 py-4 align-top sm:px-5"><code>{prop.name}</code>{prop.required && <span className="mt-1 block text-xs text-muted-foreground">required</span>}</td><td className="border-b border-border px-4 py-4 align-top sm:px-5"><code className="break-words text-xs">{prop.type}</code></td><td className="border-b border-border px-4 py-4 align-top sm:px-5"><code className="break-words text-xs">{prop.default ?? '—'}</code></td><td className="border-b border-border px-4 py-4 align-top sm:px-5">{prop.description ?? '—'}</td></tr>)}</tbody></table></div> : <p className="p-8 text-sm text-muted-foreground">No statically declared props found.</p>}
   </div>
  </div>
 </RootProvider>;
}
