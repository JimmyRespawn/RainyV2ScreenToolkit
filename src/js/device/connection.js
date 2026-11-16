(function(){
'use strict';
const $=id=>document.getElementById('connection-'+id),listeners=new Set();
const usb=RainyScreen.FILTER,receiver={...usb,productId:0x3071};
let device=null,operation=false,flashing=false,fault=null,label='',version=0,flashSuccess=false,flashTarget='ips';
const firmwareLoading=()=>!!window.RainyFirmwareSource?.isLoading();
const isBusy=()=>operation||flashing||running||!!pendingFlash||firmwareLoading();
function snapshot(){return {device,mode:device?.productId===0x3071?'wireless':device?'usb':null,busy:isBusy(),fault,label,version};}
function render(){
 const state=snapshot(),busy=state.busy||firmwareLoading(),connected=!!device;
 $('bar').setAttribute('data-connected',String(connected));$('bar').setAttribute('data-error',String(!!fault));
 $('connect').hidden=connected&&!fault;$('connect').disabled=busy||!navigator.hid;$('connect').textContent=fault?'重新连接':'连接设备';
 $('change').hidden=!connected;$('change').disabled=busy;$('change').textContent=state.mode==='wireless'?'切换 USB':'更换设备';
 $('disconnect').hidden=!connected;$('disconnect').disabled=busy;
 $('title').textContent=state.busy?(label||(pendingFlash?'等待烧录授权':'正在操作设备…')):fault?'连接需要重试':connected?(state.mode==='usb'?'USB 有线 · 已连接':'2.4G 接收器 · 已连接'):'尚未连接设备';
 $('note').textContent=!navigator.hid?'请使用支持 WebHID 的 Chrome 或 Edge':fault?fault:flashing?'连接正交由烧录流程管理，请保持设备连接':pendingFlash?'请点击烧录页的“选择设备并继续”完成授权':connected?(state.mode==='usb'?'设备信息、灯光和动画管理共用此连接':'可读取电量、控制灯光；动画管理和烧录需要 USB'):'点击连接即可；已授权的单台设备会直接重连，无需重复选择。';
 const startButton=document.getElementById('btnStart');if(startButton)startButton.disabled=operation||flashing||running||firmwareLoading()||!window.RainyFirmwareSource?.hasFirmware();
}
function notify(){render();const state=snapshot();for(const listener of listeners){try{listener(state);}catch(e){console.error(e);}}}
function validate(selected){
 if(selected.vendorId!==usb.vendorId||![usb.productId,receiver.productId].includes(selected.productId))throw Error('请选择 Rainy75 V2 键盘或接收器');
 RainyScreen.validateDevice({vendorId:selected.vendorId,productId:usb.productId,collections:selected.collections});
}
async function release(){const old=device;device=null;version++;notify();if(old?.opened)await old.close();}
function setFault(error){fault=String(error?.message||error);notify();}
async function run(name,fn){
 if(isBusy()||firmwareLoading())throw Error('设备正在操作，请稍候');
 if(!device?.opened)throw Error('请先点击顶部“连接设备”');
 if(fault)throw Error('上次通信未确认，请点击顶部“重新连接”');
 const epoch=version;operation=true;label=name;notify();
 try{return await fn();}finally{
   operation=false;label='';
   if(epoch===version&&(window.RainyBasicInfo?.hasFault()||window.RainyScreenManager?.hasFault()))fault='上次通信结果未确认，请点击“重新连接”后再试。';
   notify();
 }
}
async function initialize(){
 if(!device||fault)return;
 await window.RainyBasicInfo?.refresh();
 await loadCurrentTab();
}
async function loadCurrentTab(){
 if(!device||isBusy()||fault)return;
 if(document.getElementById('tab-animation')?.getAttribute('aria-selected')==='true'&&device.productId===usb.productId&&!window.RainyScreenManager?.hasFiles())await window.RainyScreenManager?.refresh();
}
async function connect({choose=false,usbOnly=false,bootstrap=true,quiet=false}={}){
 if(isBusy()||firmwareLoading())throw Error('请先完成当前设备操作');
 if(!navigator.hid)throw Error('请使用支持 WebHID 的 Chrome 或 Edge');
 operation=true;label=usbOnly?'正在连接 USB 键盘…':'正在连接设备…';notify();let selected;
 try{
   if(!choose){const authorized=(await navigator.hid.getDevices()).filter(d=>{if(d.vendorId!==usb.vendorId||!(usbOnly?d.productId===usb.productId:[usb.productId,receiver.productId].includes(d.productId)))return false;try{validate(d);return true;}catch{return false;}});const preferred=authorized.filter(d=>d.productId===usb.productId);if(authorized.length===1)selected=authorized[0];else if(preferred.length===1)selected=preferred[0];}
   if(!selected&&!quiet)selected=(await navigator.hid.requestDevice({filters:usbOnly?[usb]:[usb,receiver]}))[0];
   if(!selected)return false;
   validate(selected);await release();if(!selected.opened)await selected.open();device=selected;version++;fault=null;notify();
 }catch(e){fault=e.name==='NotFoundError'?null:e.message;throw e;}
 finally{operation=false;label='';notify();}
 if(bootstrap)await initialize();return true;
}
async function disconnect(){if(isBusy()||firmwareLoading())throw Error('设备正在操作，请稍候');operation=true;label='正在断开…';notify();try{await release();fault=null;}finally{operation=false;label='';notify();}}
async function prepareForFlash(key='ips'){
 flashTarget=key;
 if(operation||flashing||running||firmwareLoading())throw Error('设备正在操作，请稍候');
 if(key==='ips'&&device?.productId===receiver.productId){const connected=await connect({choose:true,usbOnly:true,bootstrap:false});if(!connected)throw Error('已取消 USB 设备选择，尚未开始烧录');}
 operation=true;label='正在交接烧录连接…';notify();
 try{await release();fault=null;flashing=true;flashSuccess=false;label=key==='rcv'?'正在烧录接收器固件…':'正在烧录屏幕固件…';}finally{operation=false;notify();}
}
async function finishFlash(){
 flashing=false;label='';notify();
 if(pendingFlash||!flashSuccess)return;
 if(flashTarget==='rcv'){flashSuccess=false;return;}
 flashSuccess=false;
 for(let attempt=0;attempt<5;attempt++){
   if(attempt)await new Promise(resolve=>setTimeout(resolve,300));
   try{if(await connect({usbOnly:true,bootstrap:true,quiet:true}))return;}catch(e){setFault(e);return;}
 }
}
window.RainyConnection={connect,disconnect,run,prepareForFlash,finishFlash,markFlashSuccess:()=>{flashSuccess=true;},isBusy,isOperating:()=>operation||flashing||running,getDevice:()=>device,getState:snapshot,refreshUi:notify,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);}};
async function click(fn){try{await fn();}catch(e){if(e.name!=='NotFoundError')setFault(e);}}
$('connect').onclick=()=>click(()=>connect());$('change').onclick=()=>click(()=>connect({choose:true,usbOnly:device?.productId===receiver.productId}));$('disconnect').onclick=()=>click(disconnect);
window.addEventListener('rainy:tab-change',()=>{loadCurrentTab().catch(setFault);});
navigator.hid?.addEventListener('disconnect',event=>{if(device===event.device){const old=device;device=null;version++;fault=null;label='';notify();old.close().catch(()=>{});}});
notify();
})();
