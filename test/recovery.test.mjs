import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
import {createHarness,FakeDevice,until} from './helpers/harness.mjs';
const code=await fs.readFile(new URL('../src/js/device/recovery.js',import.meta.url),'utf8');
async function harness(t){const h=await createHarness();vm.runInContext(code,h.ctx);t.after(()=>h.ctx.RainyRecovery.pause());return h;}
test('recovery reconnects only the previously used receiver and refreshes without a chooser',async t=>{
 const h=await harness(t),{ctx,state,hidEvents,get}=h,old=new FakeDevice(0x3071);state.authorized=[old];await ctx.RainyConnection.connect();assert.equal(ctx.RainyRecovery.isEnabled(),true);
 hidEvents.get('disconnect')({device:old});const receiver=new FakeDevice(0x3071),usb=new FakeDevice();state.authorized=[receiver];hidEvents.get('connect')({device:receiver});
 await until(()=>ctx.RainyConnection.getDevice()===receiver&&!ctx.RainyConnection.isBusy());assert.equal(receiver.opens,1);assert.equal(usb.opens,0);assert.equal(state.choices,0);assert.equal(get('info-battery').textContent,'98%');assert.equal(receiver.light[0],20);
 await until(()=>ctx.RainyConnection.getState().recoveryNote.includes('连接已恢复'));
 await ctx.RainyConnection.disconnect();hidEvents.get('connect')({device:receiver});ctx.RainyRecovery.check();await new Promise(resolve=>setTimeout(resolve,300));assert.equal(ctx.RainyRecovery.isEnabled(),false);assert.equal(ctx.RainyConnection.getDevice(),null);assert.equal(receiver.opens,1);
});
test('wake-up reopens stale authorized connection; flashing suspends recovery',async t=>{
 const {ctx,state,hidEvents}=await harness(t),device=new FakeDevice();state.authorized=[device];await ctx.RainyConnection.connect();
 device.opened=false;const NativeDate=ctx.Date;ctx.Date=class extends NativeDate{static now(){return NativeDate.now()+20000;}};ctx.dispatchEvent({type:'focus'});
 await until(()=>device.opens===2&&!ctx.RainyConnection.isBusy());assert.equal(state.choices,0);
 await ctx.RainyConnection.prepareForFlash('ips');assert.equal(ctx.RainyRecovery.isEnabled(),false);hidEvents.get('connect')({device});ctx.RainyRecovery.check();await new Promise(resolve=>setTimeout(resolve,300));assert.equal(device.opens,2);await ctx.RainyConnection.finishFlash();
});
test('ambiguous replacements never auto-select or request permission',async t=>{
 const {ctx,state,hidEvents}=await harness(t),old=new FakeDevice();state.authorized=[old];await ctx.RainyConnection.connect();hidEvents.get('disconnect')({device:old});
 const first=new FakeDevice(),second=new FakeDevice();state.authorized=[first,second];hidEvents.get('connect')({device:first});
 await until(()=>ctx.RainyConnection.getState().recoveryNote.includes('多个'));assert.equal(first.opens,0);assert.equal(second.opens,0);assert.equal(state.choices,0);
});
test('a cancelled recovery cannot attach an enumeration result arriving later',async t=>{
 const {ctx,state}=await harness(t),device=new FakeDevice();state.authorized=[device];await ctx.RainyConnection.connect();let resolve;
 ctx.navigator.hid.getDevices=()=>new Promise(done=>resolve=done);ctx.RainyRecovery.check();await until(()=>!!resolve);ctx.RainyRecovery.pause();resolve([device]);await new Promise(done=>setTimeout(done,20));assert.equal(device.opens,1);assert.equal(ctx.RainyRecovery.isEnabled(),false);
});

test('USB appearance prompts once and switching replaces the wireless recovery target',async t=>{
 const {ctx,state,hidEvents,get}=await harness(t),receiver=new FakeDevice(0x3071),usb=new FakeDevice();state.authorized=[receiver];await ctx.RainyConnection.connect();
 state.authorized=[receiver,usb];hidEvents.get('connect')({device:usb});
 await until(()=>ctx.RainyConnection.getState().recoveryNote.includes('USB 有线键盘'));
 assert.equal(ctx.RainyConnection.getDevice(),receiver);assert.equal(usb.opens,0);assert.equal(state.choices,0);
 assert.equal(ctx.RainyConnection.offerUsb(),false);
 await get('usb-switch-confirm').onclick();await until(()=>ctx.RainyConnection.getDevice()===usb&&!ctx.RainyConnection.isBusy());
 assert.equal(ctx.RainyRecovery.isWirelessTarget(),false);assert.equal(usb.opens,1);
});
