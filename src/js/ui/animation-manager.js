(function(){
'use strict';

const $=id=>document.getElementById('rm-'+id);
const panel=document.getElementById('rainy-manager');
const connection=window.RainyConnection;
const R=RainyScreen;
const logs=[];
const connectHint='用 USB 数据线连接键盘，再点顶部的「连接设备」。';
let client=null, files=null, busy=false, chosen=null;
let displayedFiles, occupied=0;

function status(message,error=false){
  $('status').textContent=message;
  $('status').setAttribute('data-error',String(error));
}

function log(message){
  logs.push(new Date().toISOString()+' '+message);
  if(logs.length>2400)logs.shift();
  $('log').textContent=logs.join('\n');
  $('log').scrollTop=$('log').scrollHeight;
}

function node(tag,className='',text=''){
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text)element.textContent=text;
  return element;
}

function createSlot(slot){
  const card=node('article','rm-slot');
  const heading=node('div','rm-slot-heading');
  const screen=node('span','rm-screen');
  screen.setAttribute('aria-hidden','true');
  const copy=node('div','rm-slot-copy');
  const title=node('h3','','壁纸 '+slot);
  title.id='rm-slot-title-'+slot;
  title.tabIndex=-1;
  const caption=node('span','rm-slot-state');
  copy.append(title,caption);
  heading.append(screen,copy);
  card.setAttribute('aria-labelledby',title.id);

  const actions=node('div','rm-slot-actions');
  const details=node('details','rm-slot-files');
  const list=node('ul','rm-files');
  details.append(node('summary','','素材详情'),list);
  const remove=node('button','rm-delete','删除这一页');
  remove.type='button';
  remove.setAttribute('aria-label','删除壁纸 '+slot);
  remove.addEventListener('click',()=>prepare(slot));
  actions.append(details,remove);
  card.append(heading,actions);
  $('slots').append(card);
  return {slot,card,title,caption,actions,details,list,remove};
}

const cards=Array.from({length:4},(_,index)=>createSlot(index+1));

function canOperate(){
  const state=connection?.getState();
  return !!client&&!client.closed&&!client.fault&&!busy&&!state?.busy&&!state?.fault;
}

function renderSlots(){
  displayedFiles=files;
  occupied=0;
  for(const view of cards){
    const entries=files?.filter(file=>file.slot===view.slot)??[];
    const filled=entries.length>0;
    if(filled)occupied++;
    view.card.setAttribute('data-state',files===null?'unread':filled?'filled':'empty');
    view.caption.textContent=files===null?'等待读取':filled?entries.length+' 个素材文件':'空槽位';
    view.actions.hidden=!filled;
    if(!filled)view.details.open=false;
    view.list.replaceChildren(...entries.map(file=>{
      const item=node('li');
      item.append(node('span','',file.name),node('span','rm-file-size',(file.size/1024).toFixed(1)+' KiB'));
      return item;
    }));
  }
}

function update(){
  const ready=canOperate();
  if(displayedFiles!==files)renderSlots();
  if(files!==null)$('badge').textContent='已使用 '+occupied+' / '+cards.length;
  $('badge').hidden=files===null;
  $('refresh').disabled=!ready;
  $('confirm').disabled=!ready||!chosen||!$('understand').checked;
  for(const card of cards)card.remove.disabled=!ready;
}

function prepare(slot){
  if(!canOperate()||!files)return;
  const entries=files.filter(file=>file.slot===slot);
  if(!entries.length)return;
  chosen={slot,expected:files.map(file=>({...file}))};
  $('delete-desc').textContent='将清空壁纸 '+slot+'，包含以下全部素材：';
  $('delete-files').replaceChildren(...entries.map(file=>node('li','',file.name+'（'+file.size+' 字节）')));
  $('understand').checked=false;
  $('confirm').disabled=true;
  $('dialog').showModal();
}

async function task(fn){
  if(!canOperate())return;
  const current=client;
  busy=true;update();
  try{await connection.run('正在管理屏幕动画…',()=>fn(current));}
  catch(error){
    log('ERROR '+error.message);
    if(client===current){
      if(current.fault)files=null;
      status(error.message,true);
    }
  }finally{busy=false;update();}
}

function refresh(){
  return task(async current=>{
    status('正在读取屏幕上的壁纸…');
    const result=await current.readSlots();
    if(client!==current)return;
    files=result;
    status('已更新壁纸列表。');
    log('FILES '+JSON.stringify(files));
  });
}

$('refresh').addEventListener('click',refresh);
$('understand').addEventListener('change',update);
$('cancel').addEventListener('click',()=>{chosen=null;$('dialog').close();});
$('dialog').addEventListener('cancel',()=>{chosen=null;});
$('confirm').addEventListener('click',()=>{
  if(!canOperate()||!$('understand').checked||!chosen)return;
  const target=chosen;
  chosen=null;
  $('dialog').close();
  return task(async current=>{
    status('正在核对并删除壁纸 '+target.slot+'…');
    log('USER_CONFIRMED_DELETE slot='+target.slot);
    const result=await current.remove(target.slot,target.expected);
    if(client!==current)return;
    files=result;
    log('VERIFIED '+JSON.stringify(files));
    status('壁纸 '+target.slot+' 已清空，删除结果已核实。');
    if(!panel.hidden)cards[target.slot-1].title.focus();
  });
});

$('export').addEventListener('click',()=>{
  if(!logs.length)return;
  const url=URL.createObjectURL(new Blob([logs.join('\n')],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download='Rainy75V2-animation-manager-log.txt';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

window.RainyScreenManager={isConnected:()=>!!client,isBusy:()=>busy,hasFault:()=>!!client?.fault,hasFiles:()=>files!==null,refresh};
let attached;
connection?.subscribe(state=>{
  if(attached!==state.device){
    client?.close(false).catch(()=>{});
    attached=state.device;
    client=null;
    files=null;
    chosen=null;
    $('dialog').close();
    if(attached?.productId===R.FILTER.productId){
      client=new R.ScreenClient(attached,log);
      status('USB 已连接，正在准备读取壁纸。');
    }else if(attached){
      status('当前为 2.4G 连接。请接上 USB 数据线，再点顶部的「切换 USB」。');
    }else{
      status(connectHint);
    }
  }else if(state.fault&&client&&!busy&&$('status').getAttribute('data-error')!=='true'){
    status('请从顶部重新连接键盘，再读取壁纸。',true);
  }
  update();
});
if(!navigator.hid)status('请用桌面版 Chrome 或 Edge 打开此网页。',true);
update();
})();
