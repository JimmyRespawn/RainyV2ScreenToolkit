(function(){
  'use strict';
  const $=id=>document.getElementById('fw-'+id);
  const templates=Object.fromEntries(Object.entries(FIRMWARE).map(([key,value])=>[key,Object.freeze({...value})]));
  const selections={ips:null,rcv:null};
  const sourceModes={ips:"community",rcv:"custom"};
  const receiver=()=>target==='rcv';
  const validator=()=>receiver()?window.RainyReceiverBin:window.RainyScreenBin;
  let active=null,draft=null,loading=false,starting=false,serial=0;
  const busy=()=>loading||starting||running||!!pendingFlash||window.RainyConnection.isOperating();
  function message(text,error=false,reason=''){
    $('status').textContent=text;
    $('status').setAttribute('data-error',String(error));
    $('error-details').hidden=!reason;
    $('error-details').open=false;
    $('error').textContent=reason;
  }
  const size=bytes=>(bytes/1024).toFixed(1)+' KiB（'+bytes.toLocaleString()+' 字节）';
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const flash=id=>document.getElementById('flash-'+id);

  function update(){
    const locked=busy(),isReceiver=receiver();
    $('target').disabled=locked;
    for(const key of Object.keys(templates)){
      $('target-'+key).checked=target===key;
      $('target-'+key).disabled=locked;
    }

    const community=!isReceiver&&sourceModes[target]==='community';
    $('source-options').hidden=isReceiver;
    $('community-option').hidden=isReceiver;
    $('community-panel').hidden=!community;
    $('custom-panel').hidden=community;
    $('source-community').checked=community;
    $('source-custom').checked=!community;
    $('source-community').disabled=locked||isReceiver;
    $('source-custom').disabled=locked||isReceiver;
    document.getElementById('themes-open').disabled=locked;

    $('title').textContent=isReceiver?'选择适用于 Rainy75 V2 2.4G 接收器的 .bin 文件。文件只在本机读取。':'选择适用于 Rainy75 V2 彩屏的 .bin 文件。文件只在本机读取。';
    $('risk').textContent=isReceiver?'使用写入偏移为 0x2000 的接收器应用 BIN。屏幕固件、键盘主控固件和整片 Flash 备份均不适用。':'使用起始地址为 0x08004000 的彩屏应用 BIN。键盘主控固件、接收器固件和整片 Flash 备份均不适用。';
    $('choose').disabled=locked;
    $('file').disabled=locked;
    $('draft').hidden=!draft||!!draft.catalog;
    $('discard').disabled=locked;
    $('confirm').disabled=locked||!draft;
    $('apply').disabled=locked||!draft||!$('confirm').checked;

    flash('source-summary').hidden=!active;
    $('clear').disabled=locked||!active;
    flash('source-name').textContent=active?.catalog?.name||active?.name||'';
    flash('next').hidden=!!active&&!draft;
    flash('next').textContent=draft?'请先确认第 2 步选中的文件。':'请先完成第 2 步，再开始更新。';
    if(active){
      flash('target-name').textContent=isReceiver?'2.4G 接收器':'Rainy75 V2 · IPS 彩屏';
      flash('source-type').textContent=active.catalog?.kind||'本地文件';
      flash('source-file').textContent=active.name;
      flash('source-version').textContent=active.catalog?active.catalog.version+'（作者提供）':'未识别，请以提供者说明为准';
      flash('source-size').textContent=size(active.size);
      flash('source-write-size').textContent=size(active.bytes.length)+' · 512 字节对齐';
      flash('source-hash').textContent=active.hash;
    }

    const {mode,fault}=window.RainyConnection.getState();
    flash('connection-hint').textContent=!navigator.hid?'请用桌面版 Chrome 或 Edge 进行更新。':isReceiver?'把 2.4G 接收器插到电脑的 USB 接口。':mode==='usb'&&!fault?'键盘已通过 USB 连接。':'用 USB 数据线把键盘连到电脑，并切到有线模式。';
  }

  function ensureIdle(){if(busy())throw Error('请等待当前设备操作或固件加载完成');}
  function clearDraft(){serial++;draft=null;$('confirm').checked=false;$('file').value='';$('candidate').textContent='';}
  function sync(){update();window.RainyConnection.refreshUi();}

  $('choose').onclick=()=>{try{ensureIdle();$('file').click();}catch(error){message(error.message,true);}};
  $('discard').onclick=()=>{if(busy())return;clearDraft();message('');sync();$('choose').focus();};
  $('file').onchange=async()=>{
    const file=$('file').files?.[0];if(!file)return;
    try{
      ensureIdle();clearDraft();loading=true;sync();message('正在检查文件…');
      if(!/\.bin$/i.test(file.name))throw Error('请选择原始 .bin，不支持 ZIP、HEX 或固件安装程序');
      if(file.size>0x7C000)throw Error('固件文件大小超出当前工具支持的范围');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const checked=validator().validate(bytes),fingerprint=await hash(bytes);
      if(running||pendingFlash||window.RainyConnection.isOperating())throw Error('设备状态已变化，请稍后重新选择');
      draft={name:file.name,size:bytes.length,bytes:checked.padded,hash:fingerprint,token:++serial};
      $('candidate').textContent=file.name;
      message('');
    }catch(error){
      clearDraft();
      const instructions=/\.bin$/i.test(file.name)?'无法使用这个文件。请确认它是给所选部件准备的固件。':'请选择以 .bin 结尾的固件文件。若是压缩包，请先解压。';
      message(instructions+(active?' 第 3 步仍显示之前确认的文件。':''),true,error.message);
    }
    finally{loading=false;sync();}
  };
  $('confirm').onchange=update;
  function applyDraft(confirmed,token){
      ensureIdle();if(!draft||!confirmed)throw Error('请先选择并确认固件文件');
      if(token!==undefined&&token!==draft.token)throw Error('固件选择已变化，请重新加载该主题');
      const descriptor={...templates[target],version:draft.catalog?draft.catalog.version+' · '+draft.catalog.name:'外部 BIN · '+draft.name};
      sourceModes[target]=draft.catalog?'community':'custom';active={...draft,descriptor,target};selections[target]=active;FIRMWARE[target]=descriptor;clearDraft();pick(target);window.RainyFlashSteps?.reset(true);sync();
      flash('source-details').open=false;message('');
  }
  $('apply').onclick=()=>{try{applyDraft($('confirm').checked);flash('review-title').focus();}catch(error){message(error.message,true);}};

  async function readDownload(response){
    const limit=0x7C000,length=Number(response.headers?.get('content-length')||0);
    if(length>limit)throw Error('下载文件超过屏幕应用区域');
    if(!response.body?.getReader){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>limit)throw Error('下载文件过大');return bytes;}
    const reader=response.body.getReader(),chunks=[];let total=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();throw Error('下载文件过大');}chunks.push(value);}}
    finally{reader.releaseLock();}
    const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
  }

  async function stageCatalog(entry,{signal}={}){
    ensureIdle();if(target!=='ips')selectTarget('ips');const catalog=window.RainyCatalog?.validate(entry);if(!catalog)throw Error('主题条目不符合当前设备或目录要求');
    sourceModes.ips='community';clearDraft();loading=true;sync();message(window.RainyOffline&&location.protocol==='file:'?'请选择离线包中的 '+catalog.file:'正在下载并校验主题 BIN…');
    try{
      let bytes;
      if(window.RainyOffline&&location.protocol==='file:')bytes=await window.RainyOffline.readBin(catalog,{signal});
      else{const response=await fetch(new URL('./'+catalog.file,document.baseURI),{signal,cache:'no-store'});if(!response.ok)throw Error('主题 BIN 下载失败（'+response.status+'）');bytes=await readDownload(response);}
      if(bytes.length!==catalog.bytes)throw Error('BIN 文件大小与清单不一致');
      const fingerprint=await hash(bytes);if(fingerprint!==catalog.sha256)throw Error('SHA-256 与清单不一致，已停止加载');
      const checked=window.RainyScreenBin.validate(bytes);
      if(signal?.aborted){const error=Error('主题加载已取消');error.name='AbortError';throw error;}
      if(running||pendingFlash||window.RainyConnection.isOperating())throw Error('设备状态已变化，请重新选择');
      draft={name:catalog.file.split('/').at(-1),size:bytes.length,bytes:checked.padded,hash:fingerprint,catalog,token:++serial};
      message('');return {token:draft.token,name:catalog.name,version:catalog.version,sha256:fingerprint};
    }catch(error){clearDraft();message(error.name==='AbortError'?'已取消主题加载':error.message+'；当前固件保持不变。',error.name!=='AbortError');throw error;}
    finally{loading=false;sync();}
  }
  $('clear').onclick=()=>{
    try{
      ensureIdle();active=null;selections[target]=null;FIRMWARE[target]={...templates[target]};
      clearDraft();flash('source-details').open=false;window.RainyFlashSteps?.reset();message('');sync();
      (sourceModes[target]==='community'?document.getElementById('themes-open'):$('choose')).focus();
    }
    catch(error){message(error.message,true);}
  };

  function selectSource(mode){
    ensureIdle();if(!['community','custom'].includes(mode)||receiver()&&mode==='community')throw Error('当前目标不支持此固件来源');
    clearDraft();sourceModes[target]=mode;message('');sync();
  }
  for(const mode of ['community','custom'])$('source-'+mode).onchange=()=>{if($('source-'+mode).checked){try{selectSource(mode);}catch(error){message(error.message,true);update();}}};
  function selectTarget(key){
    ensureIdle();if(pendingFlash)throw Error('请先完成或取消当前 BOOT 授权');
    if(!templates[key])throw Error('无效的刷写目标');
    if(target===key)return;
    selections[target]=active;clearDraft();pick(key);active=selections[key];
    flash('source-details').open=false;window.RainyFlashSteps?.reset(!!active);message('');sync();
  }
  for(const key of Object.keys(templates))$('target-'+key).onchange=()=>{
    if(!$('target-'+key).checked)return;
    try{selectTarget(key);}catch(error){message(error.message,true);update();}
  };
  const transportStart=start;
  start=async function(){
    if(!active||draft){message('请先完成第 2 步，再开始更新。',true);window.RainyTabs.select('tab-flash');return;}
    if(loading||starting||running||window.RainyConnection.isOperating()){message('请等待当前操作完成',true);return;}
    window.RainyFlashSteps?.begin();starting=true;sync();
    if(!document.getElementById('panel-flash').hidden)flash('workflow').scrollIntoView?.({block:'nearest'});
    try{await window.RainyConnection.prepareForFlash(target);return await transportStart();}
    catch(error){window.RainyFlashSteps?.stop(error.message);}
    finally{await window.RainyConnection.finishFlash();starting=false;sync();window.RainyFlashSteps?.refresh();}
  };
  window.RainyFirmwareSource={
    selectSource,getSource:()=>sourceModes[target],selectTarget,getTarget:()=>target,
    hasFirmware:()=>!!active,
    isAwaitingConfirmation:()=>!!draft,
    isLoading:()=>loading,
    stageCatalog,
    applyCatalog:(token,confirmed)=>applyDraft(confirmed,token),
    discardCatalog:token=>{if(draft?.catalog&&draft.token===token){clearDraft();sync();}},
    bytesFor(descriptor){if(!active||descriptor!==active.descriptor||descriptor!==FIRMWARE[target])throw Error('请先选择有效且与当前目标一致的 BIN');return active.bytes.slice();},
    getSelection:()=>active?{name:active.name,title:active.catalog?.name||active.name,version:active.catalog?.version||null,size:active.size,writeSize:active.bytes.length,sha256:active.hash}:null
  };
  const observer=new MutationObserver(update);
  observer.observe(document.getElementById('btnCancel'),{attributes:true,attributeFilter:['disabled']});
  window.RainyConnection.subscribe(update);sync();
})();
