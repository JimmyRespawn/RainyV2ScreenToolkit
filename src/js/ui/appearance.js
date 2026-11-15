(function(){
  'use strict';
  const root=document.documentElement,system=window.matchMedia('(prefers-color-scheme: dark)');
  let preference='auto';
  try{const saved=localStorage.getItem('rainy-appearance');if(['auto','light','dark'].includes(saved))preference=saved;}catch{}
  function apply(){root.dataset.theme=preference==='auto'?(system.matches?'dark':'light'):preference;root.style.colorScheme=root.dataset.theme;}
  apply();
  const initialize=()=>{
    const select=document.getElementById('appearance');select.value=preference;
    select.onchange=()=>{preference=['auto','light','dark'].includes(select.value)?select.value:'auto';try{localStorage.setItem('rainy-appearance',preference);}catch{}apply();};
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
  system.addEventListener('change',()=>{if(preference==='auto')apply();});
})();
