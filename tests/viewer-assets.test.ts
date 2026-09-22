import {expect,test} from 'bun:test';
import {viteAssetURLs} from '../site/plugins/asset-urls.mjs';
test('preserves Vite image URL semantics in compiled framework modules',()=>{
 const plugin=viteAssetURLs('/viewer/');
 const code='import image from "./icon.svg"; import raw from "./icon.svg?raw"; export {default as photo} from "./photo.png";';
 const result=plugin.transform(code,'/viewer/react/button/button.tsx');
 expect(result.code).toContain('"./icon.svg?url"');expect(result.code).toContain('"./photo.png?url"');expect(result.code).toContain('"./icon.svg?raw"');
 expect(plugin.transform(code,'/viewer/src/components/Header.tsx')).toBeUndefined();
 expect(plugin.transform(code,'/viewer/react/button/button.tsx?raw')).toBeUndefined();
});
