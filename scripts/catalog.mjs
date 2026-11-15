import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

export const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const folders=['firmware/official','marketplace'];
const localFolders=['firmware/bongocat','firmware/local'];
const textLimits={id:64,name:100,version:50,author:100,description:1000,license:200,sourceUrl:2000,file:250};

function validPath(file,folder,extension){return typeof file==='string'&&file.startsWith(folder+'/')&&extension.test(file)&&/^[A-Za-z0-9_./-]+$/.test(file)&&!file.split('/').some(part=>!part||part==='.'||part==='..');}

export function validateEntry(entry,folder,{local=false}={}){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Catalog entries must be objects');
  const required=[...Object.keys(textLimits),'target','startAddress','bytes','sha256','hardwareTested','redistributionAllowed','preview'];
  if(Object.keys(entry).some(key=>!required.includes(key)&&!(local&&key==='private'))||required.some(key=>!(key in entry)))throw Error('Catalog entry fields do not match the schema');
  for(const [key,limit] of Object.entries(textLimits))if(typeof entry[key]!=='string'||!entry[key].trim()||entry[key].length>limit)throw Error('Invalid catalog field: '+key);
  if(!/^[a-z0-9][a-z0-9-]{1,63}$/.test(entry.id))throw Error('Invalid catalog id');
  if(entry.target!=='rainy75v2-ips'||entry.startAddress!=='0x08004000')throw Error('Catalog only supports Rainy75 V2 IPS applications');
  if(!Number.isInteger(entry.bytes)||entry.bytes<256||entry.bytes>0x7C000||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid size or SHA-256');
  if(typeof entry.hardwareTested!=='boolean'||typeof entry.redistributionAllowed!=='boolean'||(!local&&entry.redistributionAllowed!==true)||(local&&entry.private!==true))throw Error('Testing and redistribution declarations are required');
  const url=new URL(entry.sourceUrl);if((url.protocol!=='https:'&&!(local&&url.protocol==='local:'))||url.username||url.password)throw Error('Source URL must use HTTPS without credentials');
  if(!validPath(entry.file,folder,/\.bin$/))throw Error('Firmware path must stay within '+folder);
  const preview=entry.preview;
  if(!preview||typeof preview!=='object'||preview.width!==320||preview.height!==172||!['simulation','device-capture'].includes(preview.type)||!validPath(preview.cover,folder,/\.png$/)||Object.keys(preview).some(key=>!['width','height','type','cover','animation'].includes(key))||(preview.animation!==undefined&&!validPath(preview.animation,folder,/\.gif$/)))throw Error('Preview requires a 320x172 PNG cover and optional GIF in the same directory');
  return entry;
}

async function readAsset(relative,folder){
  const file=path.resolve(root,relative),folderRoot=path.resolve(root,folder),real=await fs.realpath(file);
  if(file!==real||!real.startsWith(folderRoot+path.sep))throw Error('Catalog assets cannot contain symlinks');
  return fs.readFile(file);
}

export function validatePreviewBytes(bytes,kind){
  let width,height;
  if(kind==='png'){
    if(bytes.length<24||bytes.length>2*1024*1024||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG preview');
    width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);
  }else{
    if(bytes.length<10||bytes.length>10*1024*1024||!['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6)))throw Error('Invalid GIF preview');
    width=bytes.readUInt16LE(6);height=bytes.readUInt16LE(8);
  }
  if(width!==320||height!==172)throw Error('Preview must be exactly 320x172 pixels');
}

export async function collectCatalogs({includeLocal=false}={}){
  const context=vm.createContext({window:{},Uint8Array,DataView,ArrayBuffer});
  vm.runInContext(await fs.readFile(path.join(root,'src/js/firmware/bin-validator.js'),'utf8'),context);
  const assets=new Set(),ids=new Set(),catalogs={official:{schemaVersion:1,entries:[]},marketplace:{schemaVersion:1,entries:[]}};
  for(const folder of [...folders,...(includeLocal?localFolders:[])]){
    const local=localFolders.includes(folder);let catalog;
    try{catalog=JSON.parse(await fs.readFile(path.join(root,folder,'catalog.json'),'utf8'));}catch(error){if(local&&error.code==='ENOENT')continue;throw error;}
    if(catalog.schemaVersion!==1||!Array.isArray(catalog.entries)||Object.keys(catalog).some(key=>!['schemaVersion','entries'].includes(key)))throw Error('Invalid catalog: '+folder);
    for(const entry of catalog.entries){
      validateEntry(entry,folder,{local});if(ids.has(entry.id))throw Error('Duplicate firmware id: '+entry.id);ids.add(entry.id);
      const bytes=await readAsset(entry.file,folder);if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('File size/hash mismatch: '+entry.id);
      context.window.RainyScreenBin.validate(new Uint8Array(bytes));assets.add(entry.file);
      validatePreviewBytes(await readAsset(entry.preview.cover,folder),'png');assets.add(entry.preview.cover);
      if(entry.preview.animation){validatePreviewBytes(await readAsset(entry.preview.animation,folder),'gif');assets.add(entry.preview.animation);}
      catalogs[folder==='firmware/official'?'official':'marketplace'].entries.push(entry);
    }
  }
  return {...catalogs,assets:[...assets]};
}

export async function validateCatalogs(){return (await collectCatalogs()).assets;}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const files=await validateCatalogs();console.log(`Catalogs validated: ${files.length} published asset(s)`);
}
