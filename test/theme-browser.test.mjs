import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {createHarness,syntheticBin} from './helpers/harness.mjs';import {collectCatalogs,validatePreviewBytes} from '../scripts/catalog.mjs';

test('offline catalogs and previews need no fetch; selected BIN still requires hash and confirmation',async()=>{
  const {ctx,get,state}=await createHarness(),bytes=syntheticBin();let tampered=false;
  const entry={id:'offline-cat',name:'Offline Cat',version:'test',author:'Test',target:'rainy75v2-ips',startAddress:'0x08004000',file:'firmware/local/cat.bin',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),private:true,redistributionAllowed:false,hardwareTested:false,preview:{width:320,height:172,type:'simulation',cover:'firmware/local/cover.png'}};
  ctx.URL=URL;ctx.AbortController=AbortController;ctx.location={protocol:'file:',hostname:''};ctx.document.baseURI='file:///offline/RainyMurphy.html';
  ctx.fetch=()=>{throw Error('Offline mode must not fetch');};
  ctx.RainyOffline={local:true,catalogs:{'firmware/official':{schemaVersion:1,entries:[]},marketplace:{schemaVersion:1,entries:[entry]}},assets:{[entry.preview.cover]:'data:image/png;base64,test'},readBin:async()=>{const data=bytes.slice();if(tampered)data[100]^=1;return data;}};
  vm.runInContext(await fs.readFile(new URL('../src/js/ui/theme-browser.js',import.meta.url),'utf8'),ctx);
  await get('themes-open').onclick();const card=get('catalog-list').children[0];assert.equal(card.children[0].children[0].src,'data:image/png;base64,test');
  const select=card.children[1].children.at(-1).children[0];await select.onclick();assert.equal(get('catalog-confirmation').hidden,false);assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);
  get('catalog-confirm').checked=true;get('catalog-apply').onclick();assert.equal(ctx.RainyFirmwareSource.getSelection().sha256,entry.sha256);assert.equal(state.flashes,0);
  await get('themes-open').onclick();tampered=true;await select.onclick();assert(get('catalog-status').textContent.includes('SHA-256'));assert.equal(state.flashes,0);
});

test('private catalogs never enter the public collection and previews use the screen dimensions',async()=>{
  const catalogs=await collectCatalogs();assert(!catalogs.assets.some(file=>file.startsWith('firmware/bongocat/')||file.startsWith('firmware/local/')));assert(!catalogs.marketplace.entries.some(entry=>entry.private));
  const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(320,16);png.writeUInt32BE(172,20);assert.doesNotThrow(()=>validatePreviewBytes(png,'png'));png.writeUInt32BE(180,20);assert.throws(()=>validatePreviewBytes(png,'png'));
  const gif=Buffer.alloc(10);gif.write('GIF89a');gif.writeUInt16LE(320,6);gif.writeUInt16LE(172,8);assert.doesNotThrow(()=>validatePreviewBytes(gif,'gif'));gif.writeUInt16LE(320,8);assert.throws(()=>validatePreviewBytes(gif,'gif'));
});

test('file URLs show local-server instructions without attempting catalog requests',async()=>{
  const {ctx,get}=await createHarness();let requests=0;
  ctx.location={protocol:'file:',hostname:'',origin:'null'};ctx.fetch=async()=>{requests++;throw Error('File requests should not occur');};
  vm.runInContext(await fs.readFile(new URL('../src/js/ui/theme-browser.js',import.meta.url),'utf8'),ctx);
  await get('themes-open').onclick();assert.equal(requests,0);assert.equal(get('catalog-help').hidden,false);assert(get('catalog-status').textContent.includes('file://'));
});

test('theme preview, verified selection and explicit confirmation; private entries are localhost-only',async()=>{
  const {ctx,get,state}=await createHarness(),bytes=syntheticBin();let tampered=false;
  const entry={id:'local-theme',name:'Local Cat',version:'1.3e',author:'Test',description:'Local simulated preview',target:'rainy75v2-ips',startAddress:'0x08004000',file:'firmware/local/theme/firmware.bin',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),license:'Private',sourceUrl:'local://theme',hardwareTested:false,redistributionAllowed:false,private:true,preview:{width:320,height:172,type:'simulation',cover:'firmware/local/theme/cover.png',animation:'firmware/local/theme/preview.gif'}};
  ctx.URL=URL;ctx.AbortController=AbortController;ctx.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:4173'};ctx.document.baseURI='http://127.0.0.1:4173/RainyMurphy/';
  ctx.fetch=async input=>{const url=new URL(input);if(url.pathname.endsWith('catalog.json'))return new Response(JSON.stringify({schemaVersion:1,entries:url.pathname.includes('/marketplace/')?[entry]:[]}),{status:200});const data=bytes.slice();if(tampered)data[100]^=1;return new Response(data,{status:200,headers:{'content-length':String(data.length)}});};
  vm.runInContext(await fs.readFile(new URL('../src/js/ui/theme-browser.js',import.meta.url),'utf8'),ctx);
  assert(ctx.RainyCatalog.validate(entry));await get('themes-open').onclick();assert.equal(get('catalog-dialog').open,true);
  const card=get('catalog-list').children[0],image=card.children[0].children[0],actions=card.children[1].children.at(-1),play=actions.children[0],select=actions.children[1];
  assert.equal(image.width,320);assert.equal(image.height,172);assert(image.src.endsWith('/cover.png'));play.onclick();assert(image.src.endsWith('/preview.gif'));
  await select.onclick();assert.equal(get('catalog-confirmation').hidden,false);assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);assert.equal(state.flashes,0);
  get('catalog-apply').onclick();assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false,'Unconfirmed catalog selection cannot apply');
  get('catalog-confirm').checked=true;get('catalog-confirm').onchange();get('catalog-apply').onclick();assert.equal(get('catalog-dialog').open,false);assert.equal(get('tab-flash').getAttribute('aria-selected'),'true');assert.equal(ctx.RainyFirmwareSource.getSelection().version,'1.3e');assert.equal(state.flashes,0);assert(image.src.endsWith('/cover.png'));
  await get('themes-open').onclick();tampered=true;await select.onclick();assert.equal(get('catalog-confirmation').hidden,true);assert(get('catalog-status').textContent.includes('SHA-256'));assert.equal(ctx.RainyFirmwareSource.getSelection().sha256,entry.sha256);assert.equal(state.flashes,0);
  ctx.location.hostname='example.github.io';assert.equal(ctx.RainyCatalog.validate(entry),null,'Private samples must not be accepted on a public host');
});
