import fs from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

export function syntheticBin(length=4099){
  const bytes=new Uint8Array(length);bytes.fill(170,64);const view=new DataView(bytes.buffer);view.setUint32(0,0x20050C00,true);view.setUint32(4,0x08004101,true);return bytes;
}

export class FakeDevice{
  constructor(pid=0x3075){
    this.vendorId=0x36B0;this.productId=pid;this.productName='Rainy75 V2';this.opened=false;this.listeners=new Set();this.opens=0;this.closes=0;this.inflight=0;this.maxInflight=0;this.light=[20,1,2,100,5,0,0,1];this.ack={sub:0,status:0,value:0};this.list='S1.BIN 32\n';
    this.collections=[{usagePage:0xFF60,usage:0x61,inputReports:[{reportId:0,items:[{reportSize:8,reportCount:256}]}],outputReports:[{reportId:0,items:[{reportSize:8,reportCount:256}]}]}];
  }
  async open(){this.opened=true;this.opens++;}
  async close(){this.opened=false;this.closes++;}
  addEventListener(_,fn){this.listeners.add(fn);}
  removeEventListener(_,fn){this.listeners.delete(fn);}
  reply(bytes){const report=new Uint8Array(256);report.set(bytes);for(const fn of [...this.listeners])fn({device:this,reportId:0,data:new DataView(report.buffer)});}
  async sendReport(id,packet){
    if(!this.opened||id!==0)throw Error('Invalid simulated transport');
    this.inflight++;this.maxInflight=Math.max(this.maxInflight,this.inflight);
    try{
      if(this.silent)return;
      const command=packet[1];
      if(command===147){if(packet[3]===1)this.reply([190,147,5,1,237]);}
      else if(command===187)this.reply([190,187,6,98,0,237]);
      else if(command===227){if(!this.rejectWrite)this.light=Array.from(packet.slice(7,15));this.reply([190,227,5,this.rejectWrite?1:0,237]);}
      else if(command===228&&packet[3]===132){const data=[190,228,14,132,4,0,0,this.ack.sub,this.ack.status,this.ack.value&255,this.ack.value>>>8];this.checksummedReply(data);}
      else if(command===228){const bytes=packet[3]===69?[0]:this.light;this.checksummedReply([190,228,bytes.length+10,packet[3],bytes.length,0,0,...bytes]);}
      else if(command===26){const sub=packet[3];this.ack={sub,status:0,value:sub===10?this.list.length|256:sub===11?(this.list.charCodeAt(packet[4])||0)|((this.list.charCodeAt(packet[4]+1)||0)<<8):0};}
      else throw Error('Unexpected simulated command '+command);
    }finally{this.inflight--;}
  }
  checksummedReply(data){const sum=data.reduce((a,b)=>(a+b)&65535,0);this.reply([...data,sum&255,sum>>>8,237]);}
}

export async function createHarness(){
  const elements=new Map(),events=new Map(),hidEvents=new Map();
  function element(tag='div'){
    const el={tag,style:{},attrs:{},children:[],handlers:new Map(),disabled:false,hidden:false,checked:false,textContent:'',value:'',files:[],setAttribute(key,value){this.attrs[key]=String(value);},getAttribute(key){return this.attrs[key]??null;},toggleAttribute(key,value){if(value)this.attrs[key]='';else delete this.attrs[key];},append(...nodes){for(const node of nodes){this.children.push(node);node.parent=this;}},appendChild(node){this.append(node);},replaceChildren(...nodes){this.children=[];this.append(...nodes);},addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(fn);},removeEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},click(){},classList:{toggle(){},add(){},remove(){}}};
    Object.defineProperty(el,'id',{get(){return this._id;},set(value){this._id=value;elements.set(value,this);}});return el;
  }
  function get(id){if(!elements.has(id)){const node=element();node.id=id;}return elements.get(id);}
  const panels={flash:'panel-flash',animation:'rainy-manager',info:'panel-info',about:'panel-about'};
  for(const [name,panel] of Object.entries(panels)){const tab=get('tab-'+name);tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel);get('tool-tabs').append(tab);}
  const state={authorized:[],chooser:[],choices:0,lastFilters:null,flashes:0,flashMode:'success'};
  const ctx={document:{getElementById:get,createElement:element,querySelectorAll:selector=>selector==='#tool-tabs [role="tab"]'?get('tool-tabs').children:[]},navigator:{hid:{getDevices:async()=>state.authorized,requestDevice:async options=>{state.choices++;state.lastFilters=options.filters;return state.chooser;},addEventListener:(type,fn)=>hidEvents.set(type,fn)}},Uint8Array,DataView,ArrayBuffer,TextDecoder,TextEncoder,Date,Math,Promise,setTimeout,clearTimeout,console,crypto:webcrypto,MutationObserver:class{observe(){}},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},running:false,pendingFlash:null,target:'ips',pick(){},setStatus(text){get('status').textContent=text;},FIRMWARE:{ips:{name:'IPS',appPid:0x3075,iapPid:0x3078,startAddr:0x4000,version:'unselected'}},addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event);}};
  ctx.window=ctx;ctx.start=async()=>{state.flashes++;state.written=ctx.RainyFirmwareSource.bytesFor(ctx.FIRMWARE.ips);if(state.flashMode==='pending'){ctx.pendingFlash=ctx.FIRMWARE.ips;return;}ctx.pendingFlash=null;ctx.RainyConnection.markFlashSuccess();};vm.createContext(ctx);
  for(const file of ['device/screen-client','device/connection','ui/tabs','ui/animation-manager','ui/basic-info','firmware/bin-validator','firmware/source'])vm.runInContext(await fs.readFile(new URL('../../src/js/'+file+'.js',import.meta.url),'utf8'),ctx,{filename:file});
  async function selectBin(bytes=syntheticBin(),name='test-screen.bin'){
    get('fw-file').files=[{name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}];await get('fw-file').onchange();get('fw-confirm').checked=true;get('fw-apply').onclick();return bytes;
  }
  return {ctx,get,state,hidEvents,selectBin};
}

export async function until(predicate){const end=Date.now()+2000;while(!predicate()){if(Date.now()>end)throw Error('Timed out waiting for state');await new Promise(resolve=>setTimeout(resolve,5));}}
