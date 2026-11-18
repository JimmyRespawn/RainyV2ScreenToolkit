(function(){
  'use strict';
  const connection=window.RainyConnection,delays=[0,600,1500,3500,7000];
  let wanted=false,anchor=null,generation=0,timer=null,clock=null,inflight=false,previous=null,attempt=0,busyWaits=0,lastTick=Date.now(),lastCheck=0,awayAt=0;
  function clear(){if(timer!==null)clearTimeout(timer);timer=null;if(clock!==null)clearTimeout(clock);clock=null;}
  function note(text){connection.setRecoveryStatus(text);}
  function allowed(){return wanted&&anchor&&!running&&!pendingFlash;}
  function pause(){wanted=false;generation++;clear();attempt=0;note('');}
  function watchClock(){
    if(!wanted)return;
    clock=setTimeout(()=>{clock=null;const now=Date.now(),resumed=now-lastTick>15000;lastTick=now;if(resumed)request();watchClock();},5000);
  }
  function remember(device){
    generation++;clear();wanted=true;anchor={device,vendorId:device.vendorId,productId:device.productId,serialNumber:device.serialNumber||null};previous=device;attempt=0;busyWaits=0;lastCheck=lastTick=Date.now();note('');watchClock();
  }
  function schedule(delay){if(!allowed()||timer!==null||inflight)return;timer=setTimeout(()=>{timer=null;recover();},delay);}
  function request(){if(!allowed()||inflight||timer!==null)return;attempt=0;busyWaits=0;schedule(200);}
  async function recover(){
    if(!allowed()||inflight)return;
    if(connection.isBusy()){
      if(++busyWaits<=12)schedule(500);
      return;
    }
    const ticket=generation;inflight=true;lastCheck=Date.now();let retry=false;
    try{
      const authorized=await navigator.hid.getDevices();
      if(ticket!==generation||!allowed())return;
      if(anchor.productId===0x3071&&authorized.some(d=>d.vendorId===anchor.vendorId&&d.productId===0x3075)){
        connection.offerUsb?.();note('检测到 USB 有线键盘，可点击“切换 USB”连接。');return;
      }
      const matches=authorized.filter(device=>device.vendorId===anchor.vendorId&&device.productId===anchor.productId&&(!anchor.serialNumber||device.serialNumber===anchor.serialNumber));
      // Reuse the exact authorized interface when possible; never guess between replacements.
      const exact=matches.find(device=>device===anchor.device),selected=exact||(matches.length===1?matches[0]:null);
      if(matches.length>1&&!exact){note('检测到多个同类设备，请点击“连接设备”手动选择。');return;}
      if(!selected){note('设备已断开，正在等待已授权设备重新出现；也可点击“连接设备”。');retry=true;return;}
      const restored=await connection.connect({authorizedDevice:selected,quiet:true,recovery:true});
      if(ticket!==generation||!allowed())return;
      if(!restored){retry=true;return;}
      anchor.device=selected;attempt=0;
      note(connection.getState().fault?'设备已重新连接，但状态读取失败。请唤醒键盘后点击“刷新信息”或“重新连接”。':'连接已恢复，已尝试刷新电量与灯光状态；如状态不符，请点击“刷新信息”。');
    }catch(error){
      if(ticket===generation&&wanted){note('自动恢复未成功，请唤醒键盘，或点击“重新连接”手动恢复。');retry=true;}
    }finally{
      inflight=false;
      if(retry&&ticket===generation&&allowed()&&++attempt<delays.length)schedule(delays[attempt]);
    }
  }
  connection.subscribe(state=>{
    const lost=previous&&!state.device;previous=state.device;
    if(lost&&allowed()&&!inflight){note('设备已断开，正在等待已授权设备重新出现；也可点击“连接设备”。');request();}
  });
  navigator.hid?.addEventListener('connect',event=>{if(wanted&&event.device?.vendorId===0x36B0&&event.device.productId===0x3075&&anchor?.productId===0x3071){if(!connection.isBusy()){connection.offerUsb?.();note('检测到 USB 有线键盘，可点击“切换 USB”连接。');}else request();return;}if(!connection.getDevice())request();});
  window.addEventListener('focus',()=>{if(Date.now()-lastCheck>15000)request();});
  window.addEventListener('pageshow',event=>{if(event.persisted)request();});
  document.addEventListener?.('visibilitychange',()=>{
    if(document.visibilityState==='hidden')awayAt=Date.now();
    else if(awayAt&&Date.now()-awayAt>4000){awayAt=0;request();}
  });
  window.RainyRecovery={remember,pause,check:request,isWirelessTarget:()=>wanted&&anchor?.productId===0x3071,isEnabled:()=>wanted};
})();
