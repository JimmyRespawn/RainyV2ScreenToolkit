(function(){
  'use strict';
  if(!window.RainyOffline)return;
  const picker=document.createElement('input');picker.type='file';picker.accept='.bin,application/octet-stream';picker.hidden=true;document.body.append(picker);
  let pending=null;
  function cancelled(){const error=Error('已取消离线 BIN 选择');error.name='AbortError';return error;}
  window.RainyOffline.readBin=(entry,{signal}={})=>new Promise((resolve,reject)=>{
    if(pending){reject(Error('已有文件选择正在进行'));return;}
    let finished=false;
    const finish=(error,bytes)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);picker.onchange=null;picker.oncancel=null;picker.value='';pending=null;error?reject(error):resolve(bytes);};
    const abort=()=>finish(cancelled());pending={abort};
    picker.oncancel=abort;
    picker.onchange=async()=>{
      const file=picker.files?.[0];if(!file){abort();return;}
      try{if(file.size!==entry.bytes||file.size>0x7C000)throw Error('选择的 BIN 大小与该主题不符，请选择解压目录中的 '+entry.file);const bytes=new Uint8Array(await file.arrayBuffer());finish(null,bytes);}catch(error){finish(error);}
    };
    if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
    picker.setAttribute('aria-label','选择 '+entry.file);picker.click();
  });
})();
