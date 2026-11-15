import fs from 'node:fs/promises';
import path from 'node:path';
import { root,collectCatalogs } from './catalog.mjs';
import { checkProject } from './check.mjs';

const result=await checkProject(),output=path.resolve(root,'dist');
const includeLocal=process.argv.includes('--include-local');
if(includeLocal&&process.env.CI)throw Error('Local-only firmware cannot be built in CI');
const catalogs=await collectCatalogs({includeLocal});
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw Error('Refusing to clean an unexpected output directory');
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output,{recursive:true});
await fs.cp(path.join(root,'src'),output,{recursive:true});
for(const relative of [...catalogs.assets,'LICENSE']){
  const destination=path.join(output,relative);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(root,relative),destination);
}
for(const [relative,catalog] of [['firmware/official/catalog.json',catalogs.official],['marketplace/catalog.json',catalogs.marketplace]]){const destination=path.join(output,relative);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,JSON.stringify(catalog,null,2)+'\n');}
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built dist (${includeLocal?'LOCAL ONLY':'public'}): ${result.sourceFiles} source files; ${catalogs.assets.filter(file=>file.endsWith('.bin')).length} BIN files; ${catalogs.assets.length} catalog assets`);
