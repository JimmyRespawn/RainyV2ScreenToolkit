(function(){
  'use strict';
  const $=id=>document.getElementById('flash-'+id);
  const items=Array.from(document.querySelectorAll('#flash-steps li'));
  const notes=[
    '正在检查文件…',
    '正在准备设备。如果浏览器弹出设备列表，请选择要更新的设备。',
    '正在准备安装新固件…',
    '正在安装新固件…',
    '正在核对更新结果…',
    '正在完成更新…'
  ];
  let index=-1,phase='idle',status='',reason='';

  function refresh(){
    const button=$('boot-continue');
    const wasDisabled=button.disabled;
    button.disabled=(typeof running!=='undefined'&&running)||!!window.RainyConnection?.isOperating();
    if(phase==='awaiting'&&wasDisabled&&!button.disabled&&!document.getElementById('panel-flash').hidden){
      button.focus?.();
    }
  }

  function render(){
    const workflow=$('workflow');
    workflow.hidden=phase==='idle'||phase==='ready';
    workflow.setAttribute('data-phase',phase);
    items.forEach((item,i)=>{
      const done=phase==='success'||i<index||phase==='ready'&&i===0;
      item.setAttribute('data-state',done?'done':i===index?phase==='failed'?'failed':phase==='cancelled'?'cancelled':'current':'pending');
      if(i===index&&['active','awaiting','failed','cancelled'].includes(phase))item.setAttribute('aria-current','step');
      else item.removeAttribute('aria-current');
    });
    $('step-note').textContent=status;
    $('boot-help').hidden=phase!=='awaiting';
    $('error-details').hidden=!reason;
    $('step-error').textContent=reason;
    refresh();
  }

  function reset(ready=false){
    index=ready?0:-1;
    phase=ready?'ready':'idle';
    status=reason='';
    $('error-details').open=false;
    if(typeof setProgress==='function')setProgress(0);
    render();
  }

  function step(value){
    index=value;
    phase='active';
    status=notes[value];
    render();
  }

  function begin(){
    reason='';
    $('error-details').open=false;
    step(0);
  }

  function awaiting(){
    index=1;
    phase='awaiting';
    status='还需要一次设备授权才能继续。';
    render();
  }

  function stop(error,cancelled=false){
    phase=cancelled?'cancelled':'failed';
    reason=cancelled?'':error||'';
    if(cancelled)status=index<2?'更新已取消。':'更新已停止。请保持设备连接，重新开始更新。';
    else status=index<2?'更新未开始。请核对文件和 USB 连接，再试一次。':'更新未完成。请保持设备连接，再试一次。';
    render();
  }

  function success(){
    index=5;
    phase='success';
    status='更新完成。设备重启后即可重新连接。';
    render();
  }

  $('boot-continue').onclick=()=>{if(!running&&!window.RainyConnection?.isOperating())return window.start();};
  window.RainyFlashSteps={reset,begin,step,awaiting,stop,success,refresh,getState:()=>({index,phase})};
  window.RainyConnection?.subscribe(refresh);
  render();
})();
