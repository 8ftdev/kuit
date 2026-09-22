import { resolve } from 'node:path';
for(const framework of ['react','vue','svelte','solid']) {
 const extension=framework==='vue'?'vue':framework==='svelte'?'svelte':'tsx';
 const p=Bun.spawn(['bun','run','helper/index.ts','--origin',resolve(`examples/${framework}/button.${extension}`),'--framework',framework,'--name','shinny-button','--target',resolve('site'),'--force'],{stdout:'inherit',stderr:'inherit'});
 if(await p.exited)process.exit(1);
}
