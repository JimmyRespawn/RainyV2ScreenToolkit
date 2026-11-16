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
  const message=(text,error=false)=>{$('status').textContent=text;$('status').setAttribute('data-error',String(error));};
  const size=bytes=>(bytes/1024).toFixed(1)+' KiB（'+bytes.toLocaleString()+' 字节）';
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');

  function update(){
    const locked=busy();
    $('target').disabled=locked||!!pendingFlash;$('target').value=target;
    const name=receiver()?'2.4G 接收器':'Rainy75 V2 · IPS 彩屏';
    document.getElementById('flash-target-name').textContent=name;
    $('title').textContent=receiver()?'选择接收器固件':'选择屏幕固件';
    $('choose').textContent=receiver()?'选择接收器 BIN':'选择屏幕 BIN';
    $('risk').textContent=receiver()?'我确认这是适用于 Rainy75 V2 2.4G 接收器、写入偏移为 0x2000 的原始应用 BIN，不是屏幕、键盘主控固件或整片备份。我已知晓刷写可能导致接收器无法使用，并自愿承担风险及后果。':'我确认这是适用于 Rainy75 V2 IPS 彩屏、以 0x08004000 为起始地址的原始应用 BIN，不是主控／接收器固件或整片 Flash 备份。我已知晓刷写外部固件可能导致设备无法正常使用或硬件损坏，并自愿承担由此产生的风险及后果。';
    document.getElementById('flash-warning').textContent=receiver()?'请将目标接收器直接插入电脑，关闭官方驱动，刷写时保持连接与供电。仅限原工具支持的接收器格式，版本以文件提供者说明为准。':'请确认有线连接至设备，并确保刷写时不断连，设备不断电';
    const community=!receiver()&&sourceModes[target]==='community';
    $('community-panel').hidden=!community;$('custom-panel').hidden=community;$('community-option').hidden=receiver();
    $('source-community').checked=community;$('source-custom').checked=!community;
    $('source-community').disabled=locked||receiver();$('source-custom').disabled=locked;
    document.getElementById('themes-open').disabled=locked;
    $('choose').disabled=locked;$('file').disabled=locked;$('clear').disabled=locked||!active&&!draft;
    $('confirm').disabled=locked||!draft;$('apply').disabled=locked||!draft||!$('confirm').checked;
    document.getElementById('flash-source-type').textContent=active?.catalog?(active.catalog.private?'本地主题 · 不公开':active.catalog.kind):active?'本地 BIN':'尚未选择';
    document.getElementById('flash-source-name').textContent=active?.catalog?.name||active?.name||'请先选择对应目标的 BIN';
    document.getElementById('flash-source-file').textContent=active?active.name+' · 仅在本次页面会话中使用':'可浏览屏幕主题，或在本页选择本地 BIN';
    document.getElementById('flash-source-version').textContent=active?.catalog?active.catalog.version+'（作者提供）':active?'未识别，请以提供者说明为准':'—';
    document.getElementById('flash-source-size').textContent=active?size(active.size):'—';
    document.getElementById('flash-source-write-size').textContent=active?size(active.bytes.length)+' · 512 字节对齐':'—';
    document.getElementById('flash-source-hash').textContent=active?.hash||'尚无文件指纹';
    const state=window.RainyConnection.getState();
    document.getElementById('flash-connection-hint').textContent=receiver()?'接收器刷写 · 正常 PID 3071 / BOOT PID 3070 · 偏移 0x2000':running?'正在烧录，请保持 USB 连接与设备供电':pendingFlash?'点击“选择设备并继续”完成烧录授权':state.mode==='wireless'?'当前为 2.4G 连接，开始烧录时会引导选择 USB 键盘':state.mode==='usb'?'USB 已连接，开始烧录时自动交接连接':'烧录需要 USB 有线连接';
    $('lock').textContent=running||starting?'正在烧录，固件来源已锁定':pendingFlash?'请先完成本次烧录授权':window.RainyConnection.isOperating()?'设备正在操作，请稍候再切换固件':'';
  }

  function ensureIdle(){if(busy())throw Error('请等待当前设备操作或固件加载完成');}
  function clearDraft(){serial++;draft=null;$('confirm').checked=false;$('file').value='';$('candidate').textContent='尚未选择外部文件';}
  function sync(){update();window.RainyConnection.refreshUi();}

  $('choose').onclick=()=>{try{ensureIdle();$('file').click();}catch(error){message(error.message,true);}};
  $('file').onchange=async()=>{
    const file=$('file').files?.[0];if(!file)return;
    try{
      ensureIdle();clearDraft();loading=true;sync();message('正在检查所选 BIN…');
      if(!/\.bin$/i.test(file.name))throw Error('请选择原始 .bin，不支持 ZIP、HEX 或固件安装程序');
      if(file.size>0x7C000)throw Error('文件超过当前 IPS 屏幕应用区域');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const checked=validator().validate(bytes),fingerprint=await hash(bytes);
      if(running||pendingFlash||window.RainyConnection.isOperating())throw Error('设备状态已变化，请稍后重新选择');
      draft={name:file.name,size:bytes.length,bytes:checked.padded,hash:fingerprint,token:++serial};
      $('candidate').textContent=file.name+' · '+size(bytes.length)+' · 格式检查通过';
      message('请确认适用设备后点击“使用所选固件”。');
    }catch(error){clearDraft();message(error.message+'；当前选择保持不变。',true);}
    finally{loading=false;sync();}
  };
  $('confirm').onchange=update;
  function applyDraft(confirmed,token){
      ensureIdle();if(!draft||!confirmed)throw Error('请先选择并确认屏幕固件');
      if(token!==undefined&&token!==draft.token)throw Error('固件选择已变化，请重新加载该主题');
      const descriptor={...templates[target],version:draft.catalog?draft.catalog.version+' · '+draft.catalog.name:'外部 BIN · '+draft.name};
      sourceModes[target]=draft.catalog?'community':'custom';active={...draft,descriptor,target};selections[target]=active;FIRMWARE[target]=descriptor;clearDraft();pick(target);sync();
      message('已选用。请前往“固件烧录”，核对文件信息后点击“开始烧录”。');
  }
  $('apply').onclick=()=>{try{applyDraft($('confirm').checked);}catch(error){message(error.message,true);}};

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
      $('candidate').textContent=catalog.name+' · '+catalog.version+' · 文件大小及 SHA-256 已核对';
      message('主题已校验，请确认风险后使用。');return {token:draft.token,name:catalog.name,version:catalog.version,sha256:fingerprint};
    }catch(error){clearDraft();message(error.name==='AbortError'?'已取消主题加载':error.message+'；当前固件保持不变。',error.name!=='AbortError');throw error;}
    finally{loading=false;sync();}
  }
  $('clear').onclick=()=>{
    try{ensureIdle();active=null;selections[target]=null;FIRMWARE[target]={...templates[target]};clearDraft();sync();setStatus('请先选择目标并加载对应的 BIN。');message('已清除选择，未对设备写入任何内容。');}
    catch(error){message(error.message,true);}
  };

  function selectSource(mode){
    ensureIdle();if(!['community','custom'].includes(mode)||receiver()&&mode==='community')throw Error('当前目标不支持此固件来源');
    clearDraft();sourceModes[target]=mode;sync();
  }
  for(const mode of ['community','custom'])$('source-'+mode).onchange=()=>{if($('source-'+mode).checked){try{selectSource(mode);}catch(error){message(error.message,true);update();}}};
  function selectTarget(key){
    ensureIdle();if(pendingFlash)throw Error('请先完成或取消当前 BOOT 授权');
    if(!templates[key])throw Error('无效的刷写目标');
    selections[target]=active;clearDraft();pick(key);active=selections[key];sync();
  }
  $('target').onchange=()=>{try{selectTarget($('target').value);}catch(error){$('target').value=target;message(error.message,true);}};
  const transportStart=start;
  start=async function(){
    if(!active){message('请先选择目标并加载对应的 BIN。',true);window.RainyTabs.select('tab-flash');return;}
    if(loading||starting||running||window.RainyConnection.isOperating()){message('请等待当前操作完成',true);return;}
    starting=true;sync();
    try{await window.RainyConnection.prepareForFlash(target);return await transportStart();}
    catch(error){message(error.message,true);}
    finally{await window.RainyConnection.finishFlash();starting=false;sync();}
  };
  window.RainyFirmwareSource={
    selectSource,getSource:()=>sourceModes[target],selectTarget,getTarget:()=>target,
    hasFirmware:()=>!!active,
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
