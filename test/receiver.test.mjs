import test from 'node:test';import assert from 'node:assert/strict';
import {createHarness,syntheticBin,FakeDevice} from './helpers/harness.mjs';
function receiverBin(){const bytes=new Uint8Array(4099),view=new DataView(bytes.buffer);view.setUint32(0,0x1000006f,true);view.setUint32(12,0x200000a0,true);return bytes;}
async function choose(h,bytes,name='receiver.bin'){h.get('fw-file').files=[{name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(0)}];await h.get('fw-file').onchange();h.get('fw-confirm').checked=true;h.get('fw-apply').onclick();}
test('screen and receiver selections are separate, cross-target images fail before flashing',async()=>{
 const h=await createHarness(),{ctx,get}=h;
 await h.selectBin();const screen=ctx.FIRMWARE.ips,screenHash=ctx.RainyFirmwareSource.getSelection().sha256;
 ctx.RainyFirmwareSource.selectTarget('rcv');assert.equal(ctx.target,'rcv');assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);assert.equal(get('btnStart').disabled,true);
 await choose(h,syntheticBin(),'wrong-screen.bin');assert.equal(ctx.RainyFirmwareSource.hasFirmware(),false);
 await choose(h,receiverBin());const receiver=ctx.FIRMWARE.rcv;assert.equal(receiver.startAddr,0x2000);assert.equal(ctx.RainyFirmwareSource.bytesFor(receiver).length,4608);assert.throws(()=>ctx.RainyFirmwareSource.bytesFor(screen));
 ctx.RainyFirmwareSource.selectTarget('ips');assert.equal(ctx.RainyFirmwareSource.getSelection().sha256,screenHash);assert.throws(()=>ctx.RainyFirmwareSource.bytesFor(receiver));
 await choose(h,receiverBin());assert.equal(ctx.FIRMWARE.ips,screen);ctx.pendingFlash=screen;assert.throws(()=>ctx.RainyFirmwareSource.selectTarget('rcv'));ctx.pendingFlash=null;
});
test('receiver validation rejects whole dumps, unsupported layouts, bad entries and over-sized images',async()=>{
 const {ctx}=await createHarness(),validate=ctx.RainyReceiverBin.validate;
 assert.throws(()=>validate(syntheticBin()));assert.throws(()=>validate(new Uint8Array(0xE001)));assert.throws(()=>validate(new Uint8Array(4096)));
 const wrong=receiverBin();new DataView(wrong.buffer).setUint32(12,0x08004101,true);assert.throws(()=>validate(wrong));
 const result=validate(receiverBin());assert.equal(result.startAddress,0x2000);assert(result.padded.slice(4099).every(v=>v===255));
});
test('receiver flashing releases shared receiver without asking for a USB keyboard',async()=>{
 const h=await createHarness(),{ctx,state}=h,device=new FakeDevice(0x3071);state.authorized=[device];await ctx.RainyConnection.connect();
 ctx.RainyFirmwareSource.selectTarget('rcv');await choose(h,receiverBin());await ctx.start();assert.equal(state.flashes,1);assert.equal(state.choices,0);assert.equal(device.closes,1);assert.equal(ctx.RainyConnection.getDevice(),null);
});
