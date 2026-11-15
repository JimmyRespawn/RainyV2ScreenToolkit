(function(){
  'use strict';
  const tabs=Array.from(document.querySelectorAll('#tool-tabs [role="tab"]'));
  function select(index,focus=false){
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=i!==index;});
    if(focus)tabs[index].focus();
    window.dispatchEvent(new CustomEvent('rainy:tab-change',{detail:{panelId:tabs[index].getAttribute('aria-controls')}}));
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>select(i));
    tab.addEventListener('keydown',event=>{let next;
      if(event.key==='ArrowRight')next=(i+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();select(next,true);
    });
  });
  window.RainyTabs={select:id=>{const index=tabs.findIndex(tab=>tab.id===id);if(index>=0)select(index);}};
  select(0);
})();
