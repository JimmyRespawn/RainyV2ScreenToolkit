import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await fs.readFile(new URL('../src/js/device/screen-client.js',import.meta.url),'utf8');
const ctx=vm.createContext({Uint8Array,TextDecoder,DataView,ArrayBuffer,console,setTimeout,clearTimeout,Date});vm.runInContext(source,ctx);const R=ctx.RainyScreen;
function packet(ack,legacy=false){const a=new Uint8Array(256);a.set([190,228,14,132,4,0,0,ack.sub,ack.status,ack.value&255,ack.value>>>8]);const sum=legacy?R.sum16(R.ackRequest()):R.sum16(a.slice(0,11));a[11]=sum&255;a[12]=sum>>>8;a[13]=237;return a;}
class FakeDevice{
 constructor(files=[]){this.vendorId=0x36b0;this.productId=0x3075;this.opened=true;this.listeners=new Set;this.files=files.map(f=>({...f}));this.ack={sub:0,status:0,value:0};this.commands=[];this.output=[];this.snapshot='';this.collections=[{usagePage:0xff60,usage:0x61,inputReports:[{reportId:0,items:[{reportSize:8,reportCount:256}]}],outputReports:[{reportId:0,items:[{reportSize:8,reportCount:256}]}]}];}
 addEventListener(type,fn){this.listeners.add(fn);}removeEventListener(type,fn){this.listeners.delete(fn);}async close(){this.opened=false;}
 async sendReport(id,a){
 assert.equal(id,0);assert.equal(a.length,256);this.output.push(Array.from(a.slice(0,a[2])));
 if(a[1]===228){if(this.silent)return;const data=packet(this.ack,this.legacy);if(this.corrupt)data[11]^=33;for(const fn of this.listeners)fn({device:this,reportId:0,data:new DataView(data.buffer)});return;}
 assert.equal(a[1],26);assert.ok([10,11,12].includes(a[3]));assert.deepEqual(Array.from(a.slice(0,11)),Array.from(R.frame(a[3],a[4])));assert.ok(a.slice(11).every(b=>b===0));
 this.commands.push([a[3],a[4]]);const sub=a[3];
 if(sub===10){this.snapshot=this.files.map(f=>f.name+' '+f.size+'\n').join('');this.ack={sub,status:0,value:this.snapshot.length|(this.files.length<<8)};}
 if(sub===11){const text=this.snapshot;this.ack={sub,status:0,value:(text.charCodeAt(a[4])||0)|((text.charCodeAt(a[4]+1)||0)<<8)};}
 if(sub===12){this.deleted=(this.deleted||0)+1;this.files=this.files.filter(f=>f.slot!==a[4]);this.ack={sub,status:0,value:1};if(this.afterDelete)this.afterDelete(this);}
 }
}
const original=[{name:'S1.GIF',size:77100,slot:1,extension:'GIF'},{name:'S1.BIN',size:110080,slot:1,extension:'BIN'},{name:'S2.BIN',size:110080,slot:2,extension:'BIN'}];
const passed=[];async function test(name,fn){await fn();passed.push(name);}
await test('matches independently known request bytes',()=>{assert.equal(R.hex(R.frame(12,1)),'BE 1A 0B 0C 01 00 00 00 0D 00 ED');assert.equal(R.hex(R.ackRequest()),'BE E4 0A 84 04 00 00 34 02 ED');assert.throws(()=>R.frame(12,0));assert.throws(()=>R.frame(12,5));assert.throws(()=>R.frame(1));});
await test('accepts documented and official compatibility ACK checksum; rejects corrupt ACK',()=>{const ack={sub:12,status:0,value:2};assert.equal(R.parseAck(packet(ack)).value,2);assert.equal(R.parseAck(packet(ack,true)).legacyChecksum,true);const bad=packet(ack);bad[11]^=99;assert.throws(()=>R.parseAck(bad));});
await test('reads both formats in same slot without sending delete',async()=>{const d=new FakeDevice(original),c=new R.ScreenClient(d);const list=await c.readSlots();assert.equal(JSON.stringify(list),JSON.stringify(original));assert.equal(d.deleted,undefined);assert.ok(d.commands.filter(x=>x[0]===10).length>1,'repeated LIST uses read-only INFO fence');await c.close();});
await test('deletes exactly one selected slot, verifies empty, preserves other slot',async()=>{const d=new FakeDevice(original),c=new R.ScreenClient(d);const known=await c.readSlots();const after=await c.remove(1,known);assert.equal(d.deleted,1);assert.ok(!after.some(f=>f.slot===1));assert.equal(after[0].name,'S2.BIN');assert.equal(d.commands.filter(x=>x[0]===12).length,1);await c.close();});
await test('changed target stops before deletion',async()=>{const d=new FakeDevice(original),c=new R.ScreenClient(d);const before=await c.readSlots();d.files[0].size++;await assert.rejects(c.remove(1,before),/已变化/);assert.equal(d.deleted,undefined);await c.close();});
await test('empty slot is a read-only no-op',async()=>{const d=new FakeDevice(original),c=new R.ScreenClient(d);await c.remove(4,original);assert.equal(d.deleted,undefined);await c.close();});
await test('timeout blocks subsequent sends; no retry',async()=>{const d=new FakeDevice(original);d.silent=true;const c=new R.ScreenClient(d,()=>{},{timeout:15});await assert.rejects(c.readSlots(),/超时/);const count=d.output.length;await assert.rejects(c.readSlots());assert.equal(d.output.length,count);await c.close();});
await test('unverified deletion blocks further mutation',async()=>{const d=new FakeDevice(original),c=new R.ScreenClient(d);d.afterDelete=dev=>{dev.silent=true;c.timeout=15;};await assert.rejects(c.remove(1,original),/结果尚未核实/);assert.equal(d.deleted,1);await assert.rejects(c.remove(1,original));assert.equal(d.deleted,1);await c.close();});
await test('cached delete ACK fenced before mutation',async()=>{const d=new FakeDevice(original),c=new R.ScreenClient(d);const old=c.command.bind(c);c.command=async(sub,arg)=>{if(sub===12)d.ack={sub:12,status:0,value:1};return old(sub,arg);};await c.remove(1,original);const i=d.commands.findIndex(x=>x[0]===12);assert.equal(d.commands[i-1][0],10);assert.equal(d.deleted,1);await c.close();});
await test('rejects receiver, boot mode, and wrong report interface',()=>{for(const pid of [0x3071,0x3078]){const d=new FakeDevice;d.productId=pid;assert.throws(()=>new R.ScreenClient(d));}const d=new FakeDevice;d.collections[0].outputReports[0].items[0].reportCount=64;assert.throws(()=>new R.ScreenClient(d));});
await test('busy cached screen operation blocks delete',async()=>{const d=new FakeDevice(original);d.ack={sub:1,status:255,value:0};const c=new R.ScreenClient(d);await assert.rejects(c.remove(1,original),/未完成操作/);assert.equal(d.deleted,undefined);await c.close();});
await test('rejects malformed/duplicate file listing',()=>{assert.throws(()=>R.parseList(new TextEncoder().encode('S1.GIF 2\nS1.GIF 3\n'),2));assert.throws(()=>R.parseList(new TextEncoder().encode('S1.GIF NaN\n'),1));});
console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
