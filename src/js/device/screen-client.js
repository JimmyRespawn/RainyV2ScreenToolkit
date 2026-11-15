/* Rainy75 V2 screen slot manager. Protocol independently implemented from observed vendor JS and firmware. */
(function(global){
'use strict';
const FILTER={vendorId:0x36B0,productId:0x3075,usagePage:0xFF60,usage:0x61};
const STATUS={1:'校验失败',2:'屏幕写入失败',3:'屏幕忙',4:'存储空间不足',5:'参数错误',7:'槽位为空',8:'屏幕文件系统未就绪',253:'未检测到 IPS 屏幕'};
const sum16=a=>Array.from(a).reduce((s,b)=>(s+b)&65535,0);
const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function frame(sub,arg=0){
 if(![10,11,12].includes(sub)||!Number.isInteger(arg)||arg<0||arg>255||sub===10&&arg!==0||sub===12&&(arg<1||arg>4))throw Error('无效的槽位命令');
 const a=Uint8Array.of(190,26,11,sub,arg,0,0,0,0,0,237),s=sum16(a.slice(3,8));a[8]=s&255;a[9]=s>>>8;return a;
}
function ackRequest(){const a=Uint8Array.of(190,228,10,132,4,0,0,0,0,237),s=sum16(a.slice(0,7));a[7]=s&255;a[8]=s>>>8;return a;}
function parseAck(a){
 if(a.length<14||a[0]!==190||a[1]!==228||a[2]!==14||a[3]!==132||a[4]!==4||a[5]||a[6]||a[13]!==237||a.slice(14).some(b=>b!==0))throw Error('屏幕应答格式不匹配');
 const got=a[11]|a[12]<<8,expected=sum16(a.slice(0,11));
 if(got!==expected&&got!==sum16(ackRequest()))throw Error('屏幕应答校验失败');
 return {sub:a[7],status:a[8],value:a[9]|a[10]<<8,legacyChecksum:got!==expected};
}
function parseList(bytes,count){
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\0+$/,'').trim();
 const files=text?text.split(/\r?\n/).filter(Boolean).map(line=>{
 const m=/^([A-Za-z0-9_.-]+)\s+(\d+)$/.exec(line.trim());if(!m||!Number.isSafeInteger(Number(m[2])))throw Error('文件列表格式错误');
 const slot=/^S([1-4])\.(BIN|GIF)$/.exec(m[1]);return {name:m[1],size:Number(m[2]),slot:slot?Number(slot[1]):null,extension:slot?slot[2]:null};}):[];
 if(files.length!==count||new Set(files.map(f=>f.name)).size!==files.length)throw Error('文件列表数量不匹配');return files;
}
const signature=(files,slot)=>JSON.stringify(files.filter(f=>f.slot===slot).map(f=>({name:f.name,size:f.size})).sort((a,b)=>a.name.localeCompare(b.name)));
function reportBits(reports){if(!reports||reports.length!==1||reports[0].reportId!==0||!reports[0].items?.length)return -1;return reports[0].items.reduce((s,i)=>s+i.reportSize*i.reportCount,0);}
function validateDevice(d){
 if(d.vendorId!==FILTER.vendorId||d.productId!==FILTER.productId)throw Error('请选择 Rainy75 V2 的 USB 正常模式设备');
 const c=d.collections.filter(c=>c.usagePage===FILTER.usagePage&&c.usage===FILTER.usage);
 if(c.length!==1||reportBits(c[0].inputReports)!==2048||reportBits(c[0].outputReports)!==2048)throw Error('设备接口不匹配：需要 Report 0、256 字节的配置接口');
}
class ScreenClient{
 constructor(device,log=()=>{},options={}){
 validateDevice(device);this.device=device;this.log=log;this.timeout=options.timeout||1800;this.commandTimeout=options.commandTimeout||6000;this.pollMs=options.pollMs??8;this.fault=null;this.busy=false;this.pending=null;this.closed=false;this.legacyWarned=false;
 this.listener=event=>{
 if(event.device!==this.device||event.reportId!==0||!this.pending)return;
 const a=new Uint8Array(event.data.buffer,event.data.byteOffset,event.data.byteLength).slice();
 // Ignore notifications and responses belonging to other commands; do not reuse a reply after a timeout.
 if(a[0]!==190||a[1]!==228||a[3]!==132||a[4]!==4||a[5]!==0||a[6]!==0)return;
 try{if(a.length!==256)throw Error('HID 应答长度不是 256 字节');parseAck(a);this.pending.resolve(a);}catch(e){this.pending.reject(e);}
 };device.addEventListener('inputreport',this.listener);
 }
 assert(){if(this.closed||this.fault||!this.device.opened)throw Error(this.fault||'设备未连接');}
 poison(message){this.fault=message;this.pending?.reject(Error(message));}
 async run(fn){this.assert();if(this.busy)throw Error('已有操作正在进行');this.busy=true;try{return await fn();}finally{this.busy=false;}}
 async transport(packet,reply=false){
 this.assert();if(this.pending)throw Error('通信操作重叠');
 const allowed=packet[1]===26&&[10,11,12].includes(packet[3])||hex(packet)===hex(ackRequest());if(!allowed)throw Error('命令不在本工具允许范围内');
 const padded=new Uint8Array(256);padded.set(packet);this.log('TX '+hex(packet));
 let timer,settled=false,sendDone=false,response=null;
 try{return await new Promise((resolve,reject)=>{
 const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);this.pending=null;err?reject(err):resolve(value);};
 if(reply)this.pending={resolve:a=>{response=a;if(sendDone)finish(null,a);},reject:e=>finish(e)};
 timer=setTimeout(()=>finish(Error('通信超时，结果待确认；请断开连接后重新读取')),this.timeout);
 Promise.resolve().then(()=>this.device.sendReport(0,padded)).then(()=>{sendDone=true;if(!reply||response)finish(null,response);},e=>finish(e));
 });}catch(e){this.fault=e.message;throw e;}finally{clearTimeout(timer);}
 }
 async readAck(){const a=parseAck(await this.transport(ackRequest(),true));this.log('ACK sub='+a.sub+' status='+a.status+' value='+a.value);if(a.legacyChecksum&&!this.legacyWarned){this.log('使用官方兼容的请求缓冲区校验格式');this.legacyWarned=true;}return a;}
 checkStatus(a){if(![0,7].includes(a.status))throw Error(STATUS[a.status]||'屏幕返回状态 '+a.status);return a;}
 async poll(sub){
 const end=Date.now()+this.commandTimeout;let last;
 do{last=await this.readAck();if(last.sub===sub&&last.status!==255)return last;await pause(this.pollMs);}while(Date.now()<end);
 this.fault='等待屏幕执行结果超时，请断开重连';throw Error(this.fault+'（最后状态 '+JSON.stringify(last)+'）');
 }
 async command(sub,arg=0){
 this.assert();const cached=await this.readAck();
 if(cached.status===255){this.fault='屏幕仍有未完成操作，请等待后断开重连';throw Error(this.fault);}
 // ACK has no transaction ID. Change the cached SUB with a read-only fence before reusing it.
 if(cached.sub===sub){const fence=sub===10?11:10;await this.transport(frame(fence));this.checkStatus(await this.poll(fence));}
 await this.transport(frame(sub,arg));return this.checkStatus(await this.poll(sub));
 }
 async _list(){
 const info=await this.command(10);const packed=info.status===7?0:info.value,length=packed&255,count=packed>>>8;
 if(!length&&count)throw Error('屏幕列表长度无效');const bytes=new Uint8Array(length);
 for(let offset=0;offset<length;offset+=2){const ack=await this.command(11,offset);if(ack.status!==0)throw Error('屏幕列表读取失败');bytes[offset]=ack.value&255;if(offset+1<length)bytes[offset+1]=ack.value>>>8;}
 return parseList(bytes,count);
 }
 readSlots(){return this.run(()=>this._list());}
 remove(slot,expected){return this.run(async()=>{
 if(!Number.isInteger(slot)||slot<1||slot>4||!Array.isArray(expected))throw Error('槽位参数错误');
 const current=await this._list();if(signature(current,slot)!==signature(expected,slot))throw Error('该槽位内容已变化，已停止删除；请刷新后重新确认');
 if(!current.some(f=>f.slot===slot))return current;
 let mutationSent=false;
 try{
 // No automatic retries for a destructive command. The only writable command is SLOT_DEL.
 const oldTransport=this.transport.bind(this);
 const send=(packet,reply)=>{if(packet[1]===26&&packet[3]===12)mutationSent=true;return oldTransport(packet,reply);};
 const original=this.transport;this.transport=send;
 try{await this.command(12,slot);}finally{this.transport=original;}
 const after=await this._list();if(after.some(f=>f.slot===slot))throw Error('删除后槽位仍有文件');return after;
 }catch(e){if(mutationSent){this.fault='删除已发送，结果尚未核实；请断开重连后读取，勿重复点击';throw Error(this.fault+'。'+e.message);}throw e;}
 });}
 async close(closeDevice=true){this.closed=true;this.pending?.reject(Error('设备已断开'));this.device.removeEventListener('inputreport',this.listener);if(closeDevice&&this.device.opened)await this.device.close();}
}
global.RainyScreen={FILTER,frame,ackRequest,parseAck,parseList,signature,validateDevice,ScreenClient,hex,sum16};
})(globalThis);
