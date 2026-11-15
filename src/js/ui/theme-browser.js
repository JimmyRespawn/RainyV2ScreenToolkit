(function(){
  'use strict';
  const $=id=>document.getElementById('catalog-'+id),dialog=$('dialog'),cards=[];
  let loaded=false,loadingList=false,controller=null,token=null,generation=0;
  const localHost=()=>['localhost','127.0.0.1','[::1]'].includes(location.hostname)||(location.protocol==='file:'&&window.RainyOffline?.local===true);
  const pathIn=(value,folder,extension)=>typeof value==='string'&&value.startsWith(folder+'/')&&extension.test(value)&&/^[A-Za-z0-9_./-]+$/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');

  function validate(entry,expectedFolder){
    if(!entry||entry.target!=='rainy75v2-ips'||entry.startAddress!=='0x08004000'||typeof entry.name!=='string'||typeof entry.version!=='string'||typeof entry.author!=='string'||typeof entry.hardwareTested!=='boolean'||typeof entry.sha256!=='string'||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isInteger(entry.bytes)||entry.bytes<256||entry.bytes>0x7C000)return null;
    let folder,kind;
    if(entry.private===true){
      if(!localHost()||expectedFolder==='firmware/official')return null;
      folder=['firmware/bongocat','firmware/local'].find(value=>entry.file?.startsWith(value+'/'));kind='本地主题 · 不公开';
    }else{
      if(entry.redistributionAllowed!==true)return null;
      folder=['firmware/official','marketplace'].find(value=>entry.file?.startsWith(value+'/'));if(expectedFolder&&folder!==expectedFolder)return null;
      kind=folder==='firmware/official'?'官方目录':'社区主题';
    }
    if(!folder||!pathIn(entry.file,folder,/\.bin$/))return null;
    const preview=entry.preview;
    if(!preview||preview.width!==320||preview.height!==172||!['simulation','device-capture'].includes(preview.type)||!pathIn(preview.cover,folder,/\.png$/)||(preview.animation!==undefined&&!pathIn(preview.animation,folder,/\.gif$/)))return null;
    return {...entry,kind};
  }
  const asset=value=>window.RainyOffline?.assets?.[value]||new URL('./'+value,document.baseURI).href;
  const blocked=()=>loadingList||window.RainyConnection.isBusy()||window.RainyFirmwareSource.isLoading();
  function updateActions(){
    for(const card of cards)card.select.disabled=blocked();
    $('apply').disabled=!token||!$('confirm').checked||blocked();$('refresh').disabled=blocked();
  }
  function resetPreviews(){for(const card of cards){card.image.src=card.cover;card.playing=false;if(card.play){card.play.textContent='播放预览';card.play.setAttribute('aria-pressed','false');}}}
  function cleanup(){generation++;controller?.abort();controller=null;if(token)window.RainyFirmwareSource.discardCatalog(token);token=null;$('confirm').checked=false;$('confirmation').hidden=true;resetPreviews();updateActions();}
  function close(){cleanup();dialog.close();}

  async function choose(entry){
    if(blocked())return;
    if(token)window.RainyFirmwareSource.discardCatalog(token);
    token=null;$('confirm').checked=false;$('confirmation').hidden=true;
    const ticket=++generation;controller?.abort();controller=new AbortController();$('status').textContent=window.RainyOffline&&location.protocol==='file:'?'请选择解压目录中的 '+entry.file:'正在下载并核对 '+entry.name+'…';updateActions();
    try{
      const staged=await window.RainyFirmwareSource.stageCatalog(entry,{signal:controller.signal});
      if(ticket!==generation){window.RainyFirmwareSource.discardCatalog(staged.token);return;}
      token=staged.token;$('selected').textContent=staged.name+' · '+staged.version;$('selected-hash').textContent=staged.sha256;
      $('confirmation').hidden=false;$('status').textContent='文件大小与 SHA-256 已核对。确认后仅选用主题，不会自动烧录。';$('confirm').focus();
    }catch(error){if(ticket===generation)$('status').textContent=error.name==='AbortError'?'已取消加载':error.message;}
    finally{if(ticket===generation)controller=null;updateActions();}
  }

  function render(entries){
    resetPreviews();cards.length=0;$('list').replaceChildren();
    for(const entry of entries){
      const article=document.createElement('article');article.className='theme-card';
      const frame=document.createElement('div');frame.className='theme-preview';
      const image=document.createElement('img');image.src=asset(entry.preview.cover);image.width=320;image.height=172;image.loading='lazy';image.decoding='async';image.alt=entry.name+' '+(entry.preview.type==='simulation'?'模拟预览':'屏幕实拍');frame.append(image);
      const body=document.createElement('div');body.className='theme-card-body';
      const tag=document.createElement('p');tag.className='theme-tag';tag.textContent=entry.kind+' · '+(entry.preview.type==='simulation'?'模拟预览':'屏幕实拍');
      const title=document.createElement('h3');title.textContent=entry.name;
      const meta=document.createElement('p');meta.className='theme-meta';meta.textContent=entry.version+' · '+entry.author;
      const description=document.createElement('p');description.className='theme-description';description.textContent=entry.description||'';
      const tested=document.createElement('p');tested.className='theme-tested';tested.textContent=entry.hardwareTested?'作者标注：已实机测试':'作者标注：未实机测试';
      const actions=document.createElement('div');actions.className='theme-actions';
      const select=document.createElement('button');select.type='button';select.className='theme-select';select.textContent='选择主题';select.onclick=()=>choose(entry);
      const download=document.createElement('a');download.href=asset(entry.file);download.download=entry.file.split('/').at(-1);download.textContent='下载 BIN';
      const record={image,select,cover:asset(entry.preview.cover),playing:false,play:null};
      if(entry.preview.animation){const play=document.createElement('button');play.type='button';play.textContent='播放预览';play.setAttribute('aria-pressed','false');play.onclick=()=>{record.playing=!record.playing;image.src=record.playing?asset(entry.preview.animation):record.cover;play.textContent=record.playing?'暂停预览':'播放预览';play.setAttribute('aria-pressed',String(record.playing));};record.play=play;actions.append(play);}
      actions.append(select);if(!window.RainyOffline)actions.append(download);body.append(tag,title,meta,description,tested,actions);article.append(frame,body);$('list').append(article);cards.push(record);
    }
    updateActions();
  }

  async function load(force=false){
    if(loadingList||loaded&&!force)return;
    $('error-details').hidden=true;$('error').textContent='';
    if(location.protocol==='file:'&&!window.RainyOffline){
      $('help').hidden=false;
      $('status').textContent='当前是双击打开的 file:// 页面，浏览器限制读取社区目录和 BIN。请通过本地服务打开。';
      return;
    }
    $('help').hidden=true;
    loadingList=true;$('status').textContent='正在读取主题目录…';updateActions();
    const folders=['firmware/official','marketplace'];
    try{
      const results=await Promise.allSettled(folders.map(async folder=>{
        if(window.RainyOffline){const catalog=window.RainyOffline.catalogs[folder];if(catalog?.schemaVersion!==1||!Array.isArray(catalog.entries))throw Error('离线目录格式不支持');return catalog.entries.map(entry=>validate(entry,folder)).filter(Boolean);}
        const url=new URL('./'+folder+'/catalog.json',document.baseURI);
        let response;try{response=await fetch(url,{cache:'no-cache'});}catch{throw Error(url.pathname+'：无法请求，请确认使用 localhost 或 HTTPS，并检查本地服务是否启动');}
        if(!response.ok){let reason='';try{const problem=await response.json();reason=problem.error||'';}catch{}throw Error(url.pathname+'：HTTP '+response.status+(reason?' · '+reason:''));}
        const catalog=await response.json();if(catalog.schemaVersion!==1||!Array.isArray(catalog.entries))throw Error('目录格式不支持');
        return catalog.entries.map(entry=>validate(entry,folder)).filter(Boolean);
      }));
      const entries=results.flatMap(result=>result.status==='fulfilled'?result.value:[]),errors=results.filter(result=>result.status==='rejected').map(result=>result.reason.message);render(entries);loaded=errors.length===0;
      $('error-details').hidden=errors.length===0;$('error').textContent=errors.join('\n');
      $('status').textContent=entries.length?'预览保持屏幕 320 × 172 比例；点击“播放预览”查看动画。':errors.length?'主题目录读取失败，请展开下方“查看原因”；也可以在「关于」加载本地 BIN。':'暂未收录主题，可在「关于」加载本地 BIN。';
    }finally{loadingList=false;updateActions();}
  }

  function open(){if(!dialog.open)dialog.showModal();return load();}
  document.getElementById('themes-open').onclick=()=>open();document.getElementById('themes-open-about').onclick=()=>open();
  $('close').onclick=close;$('refresh').onclick=()=>load(true);$('confirm').onchange=updateActions;
  $('apply').onclick=()=>{try{window.RainyFirmwareSource.applyCatalog(token,$('confirm').checked);token=null;close();window.RainyTabs.select('tab-flash');}catch(error){$('status').textContent=error.message;}};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',cleanup);
  window.RainyCatalog={validate,open};window.RainyConnection.subscribe(updateActions);updateActions();
})();
