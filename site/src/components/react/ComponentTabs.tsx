import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import ButtonDropdown from '../ruixen/button-dropdown';
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

type Props = { meta: Pick<ComponentMeta, 'name' | 'entry' | 'props'>; files: SourceFile[]; pathname: string; previewUrl?: string; showProps?: boolean };

const panel = 'overflow-hidden rounded-lg border border-border';
const panelHeight = 'h-112 sm:h-136';

export default function ComponentTabs({ meta, files, pathname, previewUrl, showProps = true }: Props) {
 const [tab, setTab] = useState('preview');
 const [filename, setFilename] = useState(meta.entry);
 const [revision, setRevision] = useState(0);
 const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
 useEffect(() => {
  if (copyState === 'idle') return;
  const timeout = window.setTimeout(() => setCopyState('idle'), 2000);
  return () => window.clearTimeout(timeout);
 }, [copyState]);
 useEffect(() => setCopyState('idle'), [filename]);
 const file = files.find((item) => item.name === filename) ?? files[0];
 const preview = previewUrl ?? `${pathname.replace(/\/$/, '')}/preview/`;
 const highlighted = <Pre className="shrink-0 whitespace-pre text-xs leading-6 [tab-size:2]"><code>{file?.tokens?.map((line, i) => <span className="line min-h-6 shrink-0" key={i}>{line.map((token, j) => <span key={j} style={{ color: token.color }}>{token.content}</span>)}{i < file.tokens!.length - 1 ? '\n' : ''}</span>)}</code></Pre>;

 return <RootProvider pathname={pathname} theme={{ enabled: false }} search={{ enabled: false }}>
  <div>
   <MagneticTabs id="component" defaultValue="preview" sound={false} onChange={setTab} className="mb-2.5" items={[{ value: 'preview', label: 'Preview' }, { value: 'code', label: 'Code' }, ...(showProps ? [{ value: 'props', label: 'Props' }] : [])]} />
   <div role="tabpanel" id="component-panel-preview" aria-labelledby="component-tab-preview" hidden={tab !== 'preview'} className={`${panel} ${panelHeight} bg-card ${tab === 'preview' ? 'flex flex-col' : 'hidden'}`}>
    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 text-sm"><span className="text-xs text-muted-foreground">Live preview</span><div className="flex gap-1.5"><button type="button" title="Reload preview" aria-label="Reload preview" onClick={() => setRevision(value => value + 1)} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Icon name="reload" size={15} /></button><a href={preview} target="_blank" rel="noreferrer" title="Open preview" aria-label="Open preview in new tab" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Icon name="external" size={15} /></a></div></div>
    <iframe key={revision} src={preview} title={`${meta.name} live preview`} className="min-h-0 w-full flex-1 border-0" />
   </div>
   <div role="tabpanel" id="component-panel-code" aria-labelledby="component-tab-code" hidden={tab !== 'code'} className={`rounded-lg border border-border ${panelHeight} bg-background ${tab === 'code' ? 'flex flex-col' : 'hidden'}`}>
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground">
     <span className="w-12 shrink-0">File</span>
     <ButtonDropdown label="File" value={filename} onSelect={setFilename} items={files.map(item => ({ label: item.name, value: item.name }))} monospace className="w-60 max-w-full flex-1 sm:flex-none" />
     <span className="ml-auto hidden whitespace-nowrap font-mono sm:inline">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
     <button type="button" disabled={file?.code == null} aria-label={copyState === 'copied' ? 'Copied code' : copyState === 'failed' ? 'Copy failed; try again' : 'Copy code'} title="Copy code" onClick={async () => {
      if (file?.code == null) return;
      try { await navigator.clipboard.writeText(file.code); setCopyState('copied'); }
      catch { setCopyState('failed'); }
     }} className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 sm:ml-0">
      {copyState === 'copied' ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
     </button>
     <span role="status" className="sr-only">{copyState === 'copied' ? 'Code copied' : copyState === 'failed' ? 'Copy failed. Try again or select the code manually.' : ''}</span>
    </div>
    {file?.code !== null ? <CodeBlock key={file?.name} data-line-numbers allowCopy={false} className="my-0 flex min-h-0 flex-1 flex-col rounded-t-none rounded-b-lg border-0 bg-card shadow-none [&>div:first-child]:shrink-0" aria-label={`${file?.name} source`} viewportProps={{ className: 'min-h-0 max-h-none flex-1 overflow-auto', 'aria-label': `${file?.name} source code` }}>{highlighted}</CodeBlock> : <p className="p-8 text-sm text-muted-foreground">Binary asset included in this component’s folder.</p>}
   </div>
   {showProps && <div role="tabpanel" id="component-panel-props" aria-labelledby="component-tab-props" hidden={tab !== 'props'} className={`${panel} bg-background ${tab === 'props' ? 'block' : 'hidden'}`}>
    {meta.props.length ? <div className="max-h-140 overflow-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{['Prop', 'Type', 'Default', 'Description'].map(heading => <th key={heading} className="border-b border-border bg-card px-4 py-4 font-medium text-muted-foreground sm:px-5">{heading}</th>)}</tr></thead><tbody>{meta.props.map(prop => <tr key={prop.name}><td className="border-b border-border px-4 py-4 align-top sm:px-5"><code>{prop.name}</code>{prop.required && <span className="mt-1 block text-xs text-muted-foreground">required</span>}</td><td className="border-b border-border px-4 py-4 align-top sm:px-5"><code className="break-words text-xs">{prop.type}</code></td><td className="border-b border-border px-4 py-4 align-top sm:px-5"><code className="break-words text-xs">{prop.default ?? '—'}</code></td><td className="border-b border-border px-4 py-4 align-top sm:px-5">{prop.description ?? '—'}</td></tr>)}</tbody></table></div> : <p className="p-8 text-sm text-muted-foreground">No statically declared props found.</p>}
   </div>}
  </div>
 </RootProvider>;
}
