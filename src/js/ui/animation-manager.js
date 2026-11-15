(function(){'use strict';
const $=id=>document.getElementById('rm-'+id),R=RainyScreen;let client=null,files=null,busy=false,chosen=null,logs=[],gone=false;
const status=(message,error=false)=>{ $('status').textContent=message;$('status').setAttribute('data-error',String(error));};
function log(message){const line=new Date().toISOString()+' '+message;logs.push(line);if(logs.length>2400)logs.shift();$('log').textContent=logs.join('\n');$('log').scrollTop=$('log').scrollHeight;}
function update(){
 const connected=!!client&&!client.closed,ready=connected&&!client.fault&&!busy&&!window.RainyConnection?.isBusy();
 $('badge').textContent=connected?(client.fault?'需重新连接':busy?'处理中':'已连接'):'未连接';
 $('refresh').disabled=!ready;

 $('slots').replaceChildren();
 for(let slot=1;slot<=4;slot++){
 const card=document.createElement('article');card.className='rm-slot';const title=document.createElement('h3');title.textContent='壁纸 '+slot;card.append(title);
 const entries=files?.filter(f=>f.slot===slot),ul=document.createElement('ul');
 if(!files||!entries.length){const li=document.createElement('li');li.className='rm-empty';li.textContent=files?'空槽位 · 切换时自动跳过':'等待设备读取';ul.append(li);}
 else for(const file of entries){const li=document.createElement('li'),name=document.createElement('span'),size=document.createElement('span');name.textContent=file.name;size.textContent=(file.size/1024).toFixed(1)+' KiB';li.append(name,size);ul.append(li);}
 card.append(ul);const button=document.createElement('button');button.type='button';button.className='rm-delete';button.textContent='删除这一页';button.disabled=!ready||!entries?.length;button.addEventListener('click',()=>prepare(slot));card.append(button);$('slots').append(card);
 }
}
function prepare(slot){if(busy||!client||client.fault||!files)return;chosen={slot,expected:files.map(f=>({...f}))};$('delete-desc').textContent='将清空壁纸 '+slot+'，包含以下全部素材：';$('delete-files').replaceChildren();for(const f of files.filter(f=>f.slot===slot)){const li=document.createElement('li');li.textContent=f.name+'（'+f.size+' 字节）';$('delete-files').append(li);}$('understand').checked=false;$('confirm').disabled=true;$('dialog').showModal();}
async function task(fn){if(busy)return;busy=true;update();try{await (window.RainyConnection.run('正在管理屏幕动画…',fn));}catch(e){log('ERROR '+e.message);status(e.message,true);}finally{busy=false;update();}}
const refresh=()=>task(async()=>{if(!client)throw Error('动画管理需要 USB 有线连接，请点击顶部“切换 USB”');status('正在读取槽位…');files=await client.readSlots();status('槽位列表已更新。');log('FILES '+JSON.stringify(files));});
$('refresh').addEventListener('click',refresh);
$('understand').addEventListener('change',()=>{$('confirm').disabled=!$('understand').checked;});
$('cancel').addEventListener('click',()=>{$('dialog').close();chosen=null;});$('dialog').addEventListener('cancel',()=>{chosen=null;});
$('confirm').addEventListener('click',()=>{if(!$('understand').checked||!chosen)return;const target=chosen;chosen=null;$('dialog').close();task(async()=>{status('正在核对并删除壁纸 '+target.slot+'…');log('USER_CONFIRMED_DELETE slot='+target.slot);files=await client.remove(target.slot,target.expected);log('VERIFIED '+JSON.stringify(files));status('壁纸 '+target.slot+' 已清空，删除结果已核实。');});});
$('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([logs.join('\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='Rainy75V2-animation-manager-log.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
window.RainyScreenManager={isConnected:()=>!!client,isBusy:()=>busy,hasFault:()=>!!client?.fault,hasFiles:()=>files!==null,refresh};
if(window.RainyConnection){let attached;window.RainyConnection.subscribe(state=>{
 if(attached!==state.device){if(client)client.close(false).catch(()=>{});attached=state.device;client=null;files=null;chosen=null;$('dialog').close();
 if(attached?.productId===R.FILTER.productId){client=new R.ScreenClient(attached,log);status('USB 已连接，进入本页后将自动读取动画槽位。');}
 else status(attached?'当前为 2.4G 连接。动画管理需要 USB，请点击顶部“切换 USB”。':'请点击顶部“连接设备”，连接后无需在本页重复连接。');
 }update();
});}
if(!navigator.hid)status('请使用支持 WebHID 的桌面版 Edge / Chrome 打开此 HTML。',true);update();
})();
