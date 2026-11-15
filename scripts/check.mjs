import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { root,validateCatalogs } from './catalog.mjs';

export async function walk(directory){
  const files=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isSymbolicLink())throw Error('Unexpected symlink: '+file);if(entry.isDirectory())files.push(...await walk(file));else if(entry.isFile())files.push(file);}
  return files;
}
export async function checkProject(){
  const source=path.join(root,'src'),html=await fs.readFile(path.join(source,'index.html'),'utf8');
  if(html.includes('__ABOUT_PANEL__'))throw Error('About panel has not been assembled');
  const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),match=>match[1]);if(new Set(ids).size!==ids.length)throw Error('Duplicate HTML ids');
  for(const match of html.matchAll(/\b(?:src|href)="(\.\/[^"]+)"/g))await fs.access(path.resolve(source,match[1]));
  if(/<script\b[^>]*>[^<\s]/.test(html)||/<style\b/.test(html))throw Error('Keep scripts and styles in source files');
  for(const file of await walk(source)){
    if(/\.bin$/i.test(file))throw Error('BIN files do not belong inside src');
    if(file.endsWith('.js')){
      const code=await fs.readFile(file,'utf8');new vm.Script(code,{filename:path.relative(root,file)});
      if(/b64ToBytes|function unmask|seed\s*:|[A-Za-z0-9+/]{4096}/.test(code))throw Error('Embedded/encoded firmware is not allowed: '+file);
      if(/C:\\Users\\|Yu75V2\\|screen-animation-manager/.test(code))throw Error('Workspace-specific path leaked into source');
    }
  }
  const assets=await validateCatalogs();return {sourceFiles:(await walk(source)).length,firmwareFiles:assets.filter(file=>file.endsWith('.bin')),catalogAssets:assets};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await checkProject();console.log(`Checked ${result.sourceFiles} source files and ${result.firmwareFiles.length} catalog firmware files`);}
