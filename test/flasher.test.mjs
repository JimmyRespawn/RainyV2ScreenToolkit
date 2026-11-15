import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';

test('IPS transport writes and verifies the selected bytes; no image means no erase',async()=>{
  const elements=new Map(),calls=[];let devicesRequested=0;
  const get=id=>{if(!elements.has(id))elements.set(id,{style:{},textContent:'',classList:{add(){},remove(){},toggle(){}},appendChild(){}});return elements.get(id);};
  const boot={vendorId:0x36B0,productId:0x3078,opened:true,addEventListener(){},async close(){this.opened=false;}};
  const ctx={document:{getElementById:get,createElement:()=>({})},navigator:{hid:{getDevices:async()=>{devicesRequested++;return [boot];}}},Uint8Array,ArrayBuffer,DataView,Date,Math,Promise,setTimeout,clearTimeout,console,alert(){},calls};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(await fs.readFile(new URL('../src/js/firmware/flasher.js',import.meta.url),'utf8'),ctx);
  assert.equal(vm.runInContext('Object.keys(FIRMWARE).join()',ctx),'ips');
  const selected=new Uint8Array(512);selected[100]=87;
  ctx.RainyFirmwareSource={bytesFor:()=>selected.slice()};ctx.RainyConnection={markFlashSuccess(){calls.push(['success']);}};
  vm.runInContext("iapErase=async address=>calls.push(['erase',address]);iapWrite=async(data,address)=>calls.push(['write',Array.from(data),address]);iapVerify=async(data,address)=>calls.push(['verify',Array.from(data),address]);iapEnd=async()=>calls.push(['end']);",ctx);
  await ctx.start();assert.deepEqual(calls.map(call=>call[0]),['erase','write','verify','end','success']);assert.equal(calls[0][1],0x4000);assert.deepEqual(Array.from(calls[1][1]),Array.from(selected));assert.deepEqual(Array.from(calls[2][1]),Array.from(selected));assert.equal(vm.runInContext('pendingFlash',ctx),null);
  calls.length=0;devicesRequested=0;ctx.RainyFirmwareSource.bytesFor=()=>{throw Error('No firmware selected');};await ctx.start();assert.equal(calls.length,0);assert.equal(devicesRequested,0);
});
