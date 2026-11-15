import test from 'node:test';import assert from 'node:assert/strict';
import { createHarness,FakeDevice,syntheticBin,until } from './helpers/harness.mjs';

test('firmware is absent until explicit selection; invalid files preserve the active image',async()=>{
  const {ctx,get,selectBin}=await createHarness();
  assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);assert.equal(get('btnStart').disabled,true);
  await ctx.start();assert.equal(get('tab-about').getAttribute('aria-selected'),'true');
  const bytes=syntheticBin();get('fw-file').files=[{name:'screen.bin',size:bytes.length,arrayBuffer:async()=>bytes.buffer}];await get('fw-file').onchange();assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);
  await selectBin(bytes);const descriptor=ctx.FIRMWARE.ips,selected=ctx.RainyFirmwareSource.bytesFor(descriptor);assert.equal(selected.length,4608);assert(selected.slice(bytes.length).every(v=>v===255));
  const bad=syntheticBin();new DataView(bad.buffer).setUint32(4,0x08000101,true);await selectBin(bad,'wrong.bin');assert.equal(ctx.FIRMWARE.ips,descriptor);
  selected[0]^=1;assert.equal(ctx.RainyFirmwareSource.bytesFor(descriptor)[0],bytes[0]);
  get('fw-clear').onclick();assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);assert.equal(get('btnStart').disabled,true);
});

test('shared USB connection, serialized tools, flashing handoff and receiver switching',async()=>{
  const {ctx,get,state,selectBin,hidEvents}=await createHarness(),usb=new FakeDevice(),receiver=new FakeDevice(0x3071);state.authorized=[usb];
  assert.equal(state.choices,0);assert.equal(usb.opens,0);await ctx.RainyConnection.connect();assert.equal(usb.opens,1);assert.equal(get('info-battery').textContent,'98%');assert.equal(get('btnStart').disabled,true);
  ctx.RainyTabs.select('tab-animation');await until(()=>ctx.RainyScreenManager.hasFiles()&&!ctx.RainyConnection.isBusy());assert.equal(usb.closes,0);assert.equal(state.choices,0);
  await get('info-light').onclick();assert.equal(usb.light[0]&1,1);assert.equal(usb.maxInflight,1);
  let release;const job=ctx.RainyConnection.run('exclusive',()=>new Promise(resolve=>release=resolve));await assert.rejects(ctx.RainyConnection.run('overlap',async()=>{}));release();await job;
  await selectBin();assert.equal(get('btnStart').disabled,false);await ctx.start();assert.equal(state.flashes,1);assert.equal(usb.opens,2);assert.equal(usb.closes,1);assert.equal(ctx.RainyConnection.getDevice(),usb);
  state.flashMode='pending';await ctx.start();assert.equal(get('btnStart').disabled,false);assert.equal(get('connection-connect').disabled,true);state.flashMode='success';await ctx.start();assert.equal(ctx.RainyConnection.getDevice(),usb);
  await ctx.RainyConnection.disconnect();state.authorized=[receiver];await ctx.RainyConnection.connect();assert.equal(ctx.RainyConnection.getState().mode,'wireless');assert.equal(ctx.RainyScreenManager.isConnected(),false);
  state.chooser=[];const count=state.flashes;await ctx.start();assert.equal(state.flashes,count);assert.equal(ctx.RainyConnection.getDevice(),receiver);
  state.chooser=[usb];state.authorized=[usb];await ctx.start();assert.equal(state.lastFilters[0].productId,0x3075);assert.equal(ctx.RainyConnection.getDevice(),usb);
  usb.silent=true;const refresh=ctx.RainyBasicInfo.refresh();await new Promise(resolve=>setTimeout(resolve,0));hidEvents.get('disconnect')({device:usb});await refresh;assert.equal(ctx.RainyConnection.getDevice(),null);assert.equal(ctx.RainyConnection.isBusy(),false);
});

test('image checks reject wrong target addresses and over-sized data',async()=>{
  const {ctx}=await createHarness(),validate=ctx.RainyScreenBin.validate;
  assert.throws(()=>validate(new Uint8Array(10)));assert.throws(()=>validate(new Uint8Array(0x7C001)));
  const wrong=syntheticBin();new DataView(wrong.buffer).setUint32(4,0x08000101,true);assert.throws(()=>validate(wrong));assert.equal(validate(syntheticBin()).padded.length,4608);
});
