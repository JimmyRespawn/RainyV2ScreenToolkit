import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const code=await fs.readFile(new URL('../src/js/ui/flash-steps.js',import.meta.url),'utf8');
test('step presentation distinguishes idle, BOOT authorization, failures, cancellation and success',()=>{
 const elements=new Map(),node=()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}}),items=Array.from({length:6},node),get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};let starts=0;
 const ctx={document:{getElementById:get,querySelectorAll:()=>items},running:false,start:()=>starts++,RainyConnection:{isOperating:()=>false,subscribe(fn){fn();}}};ctx.window=ctx;vm.runInNewContext(code,ctx);const flow=ctx.RainyFlashSteps;
 assert.equal(flow.getState().phase,'idle');flow.reset(true);assert.equal(items[0].attrs['data-state'],'done');flow.begin();flow.step(1);flow.awaiting();assert.equal(get('flash-boot-help').hidden,false);assert.equal(items[1].attrs['aria-current'],'step');assert.equal(starts,0);
 get('flash-boot-continue').onclick();assert.equal(starts,1);ctx.running=true;flow.refresh();assert.equal(get('flash-boot-continue').disabled,true);get('flash-boot-continue').onclick();assert.equal(starts,1);
 flow.step(3);flow.stop('Disconnected');assert.equal(items[3].attrs['data-state'],'failed');assert.equal(items[4].attrs['data-state'],'pending');assert.equal(get('flash-boot-help').hidden,true);
 flow.begin();flow.step(1);flow.stop('',true);assert.equal(flow.getState().phase,'cancelled');assert.equal(items[1].attrs['data-state'],'cancelled');
 flow.begin();flow.step(5);assert.notEqual(items[5].attrs['data-state'],'done');flow.success();assert(items.every(item=>item.attrs['data-state']==='done'));flow.reset();assert(items.every(item=>item.attrs['data-state']==='pending'));
});

test('real transport pauses for BOOT authorization without erase, then completes stages on retry',async()=>{
 const elements=new Map(),events=[],get=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{add(){},remove(){}},appendChild(){}});return elements.get(id);};
 const ctx={document:{getElementById:get,createElement:()=>({})},navigator:{hid:{getDevices:async()=>[],requestDevice:async()=>{throw Error('User gesture required');}}},Uint8Array,ArrayBuffer,DataView,Date,Math,Promise,setTimeout,clearTimeout,console,alert(){},events};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(await fs.readFile(new URL('../src/js/firmware/flasher.js',import.meta.url),'utf8'),ctx);
 ctx.RainyFirmwareSource={bytesFor:()=>new Uint8Array(512)};ctx.RainyFlashSteps={begin:()=>events.push('check'),step:i=>events.push('step'+i),awaiting:()=>events.push('authorize'),success:()=>events.push('success'),stop:()=>events.push('stopped'),refresh(){}};
 vm.runInContext("pick('rcv');sleep=async()=>{};sendPkt=async()=>{};connectApp=async()=>{dev={productId:0x3071,close:async()=>{}};};iapErase=async()=>events.push('erase');iapWrite=async()=>events.push('write');iapVerify=async()=>events.push('verify');iapEnd=async()=>events.push('end');",ctx);
 await ctx.start();assert(events.includes('authorize'));assert(!events.includes('erase'));assert(vm.runInContext('pendingFlash!==null',ctx));
 const boot={vendorId:0x36b0,productId:0x3070,opened:true,addEventListener(){},async close(){}};ctx.navigator.hid.getDevices=async()=>[boot];events.length=0;await ctx.start();assert.deepEqual(events,['check','step1','step2','erase','step3','write','step4','verify','step5','end','success']);assert.equal(vm.runInContext('pendingFlash',ctx),null);
 events.length=0;ctx.RainyFirmwareSource.bytesFor=()=>{throw Error('File missing');};await ctx.start();assert.deepEqual(events,['check','stopped']);
});
