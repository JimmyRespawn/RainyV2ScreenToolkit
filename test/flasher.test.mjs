import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';

test('receiver transport selects receiver BOOT and writes only at 0x2000; controller is unsupported',async()=>{
 const elements=new Map(),calls=[],get=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){}},appendChild(){}});return elements.get(id);};
 const device=pid=>({vendorId:0x36B0,productId:pid,opened:true,addEventListener(){},async close(){this.opened=false;}}),screen=device(0x3078),receiver=device(0x3070);
 const ctx={document:{getElementById:get,createElement:()=>({})},navigator:{hid:{getDevices:async()=>[screen,receiver]}},Uint8Array,ArrayBuffer,DataView,Date,Math,Promise,setTimeout,clearTimeout,console,alert(){},calls};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(await fs.readFile(new URL('../src/js/firmware/flasher.js',import.meta.url),'utf8'),ctx);
 ctx.RainyFirmwareSource={bytesFor:descriptor=>{assert.equal(descriptor.appPid,0x3071);return new Uint8Array(512);}};
 vm.runInContext("pick('rcv');iapErase=async address=>calls.push(['erase',address]);iapWrite=async(data,address)=>calls.push(['write',address]);iapVerify=async(data,address)=>calls.push(['verify',address]);iapEnd=async()=>calls.push(['end']);",ctx);
 await ctx.start();assert.deepEqual(calls.map(x=>x[0]),['erase','write','verify','end']);assert(calls.slice(0,3).every(x=>x[1]===0x2000));assert.equal(screen.opened,true);
 assert.equal(vm.runInContext('FIRMWARE.rcv.bootCmd.join()',ctx),'190,252,4,237');assert.equal(vm.runInContext('FIRMWARE.kbd',ctx),undefined);
 vm.runInContext('pendingFlash=FIRMWARE.rcv',ctx);await ctx.cancel();assert.equal(vm.runInContext('pendingFlash',ctx),null);
});

test('IPS transport writes and verifies the selected bytes; no image means no erase',async()=>{
  const elements=new Map(),calls=[];let devicesRequested=0;
  const get=id=>{if(!elements.has(id))elements.set(id,{style:{},textContent:'',classList:{add(){},remove(){},toggle(){}},appendChild(){}});return elements.get(id);};
  const boot={vendorId:0x36B0,productId:0x3078,opened:true,addEventListener(){},async close(){this.opened=false;}};
  const ctx={document:{getElementById:get,createElement:()=>({})},navigator:{hid:{getDevices:async()=>{devicesRequested++;return [boot];}}},Uint8Array,ArrayBuffer,DataView,Date,Math,Promise,setTimeout,clearTimeout,console,alert(){},calls};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(await fs.readFile(new URL('../src/js/firmware/flasher.js',import.meta.url),'utf8'),ctx);
  assert.equal(vm.runInContext('Object.keys(FIRMWARE).sort().join()',ctx),'ips,rcv');
  const selected=new Uint8Array(512);selected[100]=87;
  ctx.RainyFirmwareSource={bytesFor:()=>selected.slice()};ctx.RainyConnection={markFlashSuccess(){calls.push(['success']);}};
  vm.runInContext("iapErase=async address=>calls.push(['erase',address]);iapWrite=async(data,address)=>calls.push(['write',Array.from(data),address]);iapVerify=async(data,address)=>calls.push(['verify',Array.from(data),address]);iapEnd=async()=>calls.push(['end']);",ctx);
  await ctx.start();assert.deepEqual(calls.map(call=>call[0]),['erase','write','verify','end','success']);assert.equal(calls[0][1],0x4000);assert.deepEqual(Array.from(calls[1][1]),Array.from(selected));assert.deepEqual(Array.from(calls[2][1]),Array.from(selected));assert.equal(vm.runInContext('pendingFlash',ctx),null);
  calls.length=0;devicesRequested=0;ctx.RainyFirmwareSource.bytesFor=()=>{throw Error('No firmware selected');};await ctx.start();assert.equal(calls.length,0);assert.equal(devicesRequested,0);
});
