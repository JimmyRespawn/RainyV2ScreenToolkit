(function(){
'use strict';
const panel=document.getElementById('panel-info');
const $=id=>document.getElementById('info-'+id);let device=null,busy=false,pending=null,transportFault=false,lightConfig=null,lastBattery=null,profileEpoch=0;
function message(text,error=false){
 $('status').textContent=text;
 $('status').setAttribute('data-error',String(error));
}
function update(){const sharedBusy=!!window.RainyConnection?.isBusy();panel.setAttribute('data-connected',String(!!device));panel.setAttribute('data-reading',String(busy));$('refresh').disabled=!device||busy||transportFault||sharedBusy;$('light').disabled=!device||busy||sharedBusy||transportFault||!lightConfig;$('light').setAttribute('aria-checked',String(!!(lightConfig?.[0]&1)));$('light-state').textContent=lightConfig?(lightConfig[0]&1?'已开启':'已关闭'):'未读取';}

function clear(){
 panel.setAttribute('data-battery-read','false');
 $('battery').textContent='—';
 $('fill').style.width='0%';
 $('charge').textContent='未读取';
 $('charge').setAttribute('data-charge','unknown');
 $('runtime').textContent='等待读取';
 $('time').textContent='—';
}
const trace=$('trace');
const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,'0')).join(' ');
function log(text){trace.textContent=(trace.textContent+'\n'+new Date().toLocaleTimeString()+' '+text).split('\n').slice(-80).join('\n');}
function receive(e){
 if(e.device!==device||e.reportId!==0)return;
 const a=new Uint8Array(e.data.buffer,e.data.byteOffset,e.data.byteLength);log('RX '+hex(a.slice(0,Math.min(a.length,24))));
 if(a[0]===190&&a[1]===192){profileEpoch++;lightConfig=null;update();}
 if(!pending||!pending.sent||a[0]!==190||a[1]!==pending.command)return;
 const n=a[2]===0&&a[1]===187?6:a[2];if(n<4||n>a.length||a[n-1]!==237)return;
 const frame=a.slice(0,n);
 if(frame[1]===228&&(n!==pending.length+10||frame[3]!==pending.dataId||frame[4]!==pending.length||frame[5]!==0||frame[6]!==0))return;
 if(frame[1]===227&&n!==5)return;
 if(frame[1]===147&&(n!==5||frame[3]!==1))return;
 if(frame[1]===187&&(![6,10,14].includes(n)||frame[3]>100))return;
 pending.resolve(frame);
}
async function exchange(packet,reply=true,cleanup=false){
 const current=device;if(!current?.opened)throw Error('设备已断开');
 if(transportFault&&!cleanup)throw Error('上次通信结果未确认，请断开后重新连接');
 const report=new Uint8Array(256);report.set(packet);let timer;
 try{return await new Promise((resolve,reject)=>{
   let sendDone=false,response=null;const request={command:packet[1],resolve:frame=>{response=frame;if(sendDone)resolve(frame);},reject,sent:false,dataId:packet[3],length:packet[4]};if(reply)pending=request;
   timer=setTimeout(()=>reject(Error('读取超时（命令 0x'+packet[1].toString(16)+'）；请关闭官网驱动页面，唤醒键盘后重试')),3000);
   log('TX '+hex(packet));request.sent=true;
   Promise.resolve().then(()=>current.sendReport(0,report)).then(()=>{sendDone=true;if(!reply)resolve();else if(response)resolve(response);},reject);
 });}catch(e){transportFault=true;throw e;}finally{clearTimeout(timer);pending=null;}
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));let lastReadEnd=0;
const sum16=a=>Array.from(a).reduce((s,v)=>(s+v)&65535,0);
function parameterPacket(command,id,dataOrLength){
 if(command===228&&![50,69].includes(id)||command===227&&(id!==50||dataOrLength.length!==8)||![227,228].includes(command))throw Error('不支持的灯光命令');
 const data=command===227?Array.from(dataOrLength):[],length=command===227?data.length:dataOrLength;
 const bytes=Uint8Array.from([190,command,command===227?length+10:10,id,length,0,0,...data,0,0,237]);
 const checksum=sum16(bytes.slice(0,-3));bytes[bytes.length-3]=checksum&255;bytes[bytes.length-2]=checksum>>>8;return bytes;
}
async function readParameter(id){
 await pause(10);const frame=await exchange(parameterPacket(228,id,id===50?8:1));
 const checksum=frame[frame.length-3]|frame[frame.length-2]<<8;
 if(checksum!==sum16(frame.slice(0,-3)))log('E4 checksum compatibility: validating identity and readback as official driver');
 const data=frame.slice(7,-3);if(id===69&&data[0]>3)throw Error('板载配置编号无效');return data;
}
async function withSession(fn){
 const current=device,wireless=current?.productId===0x3071;let attempted=false;
 try{if(wireless){await pause(Math.max(0,lastReadEnd+100-Date.now()));attempted=true;await exchange([190,147,5,1,237]);await pause(10);}return await fn();}
 finally{if(attempted&&device===current&&current.opened){await pause(10);try{await exchange([190,147,5,0,237],false,true);}catch(e){log('结束无线会话失败：'+e.message);}finally{lastReadEnd=Date.now();}}}
}
async function readLight(){
 const epoch=profileEpoch,profile=(await readParameter(69))[0],config=await readParameter(50);
 if((await readParameter(69))[0]!==profile||profileEpoch!==epoch)throw Error('读取期间板载配置发生变化，请刷新');
 lightConfig=config;return config;
}
async function toggleLight(){
 const enabled=!(lightConfig[0]&1);message(enabled?'正在开启灯光…':'正在关闭灯光…');
 try{await withSession(async()=>{
   const epoch=profileEpoch,profile=(await readParameter(69))[0],before=await readParameter(50);
   if((await readParameter(69))[0]!==profile||profileEpoch!==epoch)throw Error('板载配置发生变化，请刷新后重试');
   const intended=before.slice();intended[0]=(before[0]&252)|(enabled?1:0);
   lightConfig=null;update();await pause(10);
   const ack=await exchange(parameterPacket(227,50,intended));
   if(ack[3]!==0)throw Error('设备拒绝灯光切换，状态 '+ack[3]);
   const actual=await readParameter(50);
   if((await readParameter(69))[0]!==profile||profileEpoch!==epoch||actual.some((v,i)=>v!==intended[i]))throw Error('灯光回读未确认，请断开后重连核对');
   lightConfig=actual;
 });message(enabled?'键盘灯光已开启':'键盘灯光已关闭');}
 catch(e){transportFault=true;lightConfig=null;throw e;}
 finally{if(lastBattery)updateRuntime(lastBattery);}
}
async function read(){
 const current=device;
 clear();lightConfig=null;lastBattery=null;message('正在读取设备信息…');let result,lightError;
 await withSession(async()=>{const frame=await exchange([190,187,4,237]);result={percent:frame[3],charge:frame[4]};try{await readLight();}catch(e){lightError=e;log('LIGHT '+e.message);}});
 if(device!==current)return;
 lastBattery=result;
 panel.setAttribute('data-battery-read','true');
 $('fill').style.width=result.percent+'%';
 $('battery').textContent=result.percent+'%';
 $('charge').textContent=({0:'未充电',1:'已充满',2:'正在充电'})[result.charge]??'未知状态（'+result.charge+'）';
 $('charge').setAttribute('data-charge',({0:'unplugged',1:'charged',2:'charging'})[result.charge]??'unknown');
 updateRuntime(result);
 $('time').textContent=new Date().toLocaleString();
 message(lightError?'已读取电量。灯光状态未能读出，可唤醒键盘或重新连接后再试。':'设备信息已更新',!!lightError);
}
function updateRuntime(result){
 const capacityMah=10000,lowCurrentMa=20,highCurrentMa=50;
 const low=Math.floor(capacityMah*(result.percent/100)/highCurrentMa),high=Math.floor(capacityMah*(result.percent/100)/lowCurrentMa);
 const field=$('runtime');field.title='粗略理论估算，假设 1kHz、RGB 关闭、平均电流 20–50mA；彩屏和休眠功耗尚未实测。';
 if(!lightConfig)field.textContent='灯光状态未知，暂不估算';
 else if(lightConfig[0]&1)field.textContent='RGB 已开启，暂不估算';
 else if(result.charge===2)field.textContent='充电中，暂不估算';
 else if(result.charge===0||result.charge===1)field.textContent=(device.productId===0x3071?'约 ':'无线参考：')+low+'–'+high+' 小时';
 else field.textContent='充电状态未知，暂不估算';
}
async function task(fn){
 if(busy)return;
 const current=device;
 busy=true;update();
 try{await window.RainyConnection.run('正在读取或更新设备信息…',fn);}
 catch(e){
   log('ERROR '+e.message);
   if(device===current){
     if(!lastBattery)$('battery').textContent='读取失败';
     message('操作未完成。请唤醒键盘，或重新连接后再试。',true);
   }
 }finally{busy=false;update();}
}
$('refresh').onclick=()=>task(read);$('light').onclick=()=>{if(!device||busy||transportFault||!lightConfig)return;return task(toggleLight);};
window.RainyBasicInfo={isConnected:()=>!!device,refresh:()=>task(read),hasFault:()=>transportFault};
window.RainyConnection.subscribe(state=>{
 if(device!==state.device){pending?.reject(Error('连接已切换'));if(device)device.removeEventListener('inputreport',receive);device=state.device;transportFault=false;profileEpoch=0;lightConfig=null;lastBattery=null;clear();
 if(device){device.addEventListener('inputreport',receive);$('mode').textContent=device.productId===0x3071?'2.4G 接收器 · 已连接':'USB 有线 · 已连接';$('name').textContent=device.productName||'Rainy75 V2';$('id').textContent='VID '+device.vendorId.toString(16).toUpperCase()+' / PID '+device.productId.toString(16).toUpperCase();message('已连接，正在准备读取设备信息。');}
 else{$('mode').textContent='未连接设备';$('name').textContent='未连接';$('id').textContent='—';message('连接后会自动读取设备状态。');}
 }update();
});
update();
})();
