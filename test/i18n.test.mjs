import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const code=await fs.readFile(new URL('../src/js/ui/i18n.js',import.meta.url),'utf8');
function harness(browserLanguage='en-US',saved=null){
  const root={nodeType:1,childNodes:[],closest:()=>false,getAttribute:()=>null},select={value:''};
  const text={nodeType:3,nodeValue:'基础信息',parentElement:root};root.childNodes.push(text);
  const label={nodeType:1,childNodes:[],closest:()=>false,attrs:{'aria-label':'键盘 RGB 灯光'},getAttribute(key){return this.attrs[key]??null;},setAttribute(key,value){this.attrs[key]=value;}};root.childNodes.push(label);
  let callback,languageChanged;const stored={value:saved};
  const context={document:{documentElement:root,readyState:'complete',getElementById:()=>select},navigator:{languages:[browserLanguage]},localStorage:{getItem:()=>stored.value,setItem:(_,value)=>stored.value=value},MutationObserver:class{constructor(fn){callback=fn;}observe(){}disconnect(){}},WeakMap};context.window=context;context.addEventListener=(_,fn)=>languageChanged=fn;vm.runInNewContext(code,context);
  return {root,text,label,select,context,stored,mutate:()=>callback([{type:'characterData',target:text}]),languageChanged};
}
test('language auto detection, manual override, restored Chinese and live device messages',()=>{
  const h=harness();assert.equal(h.root.lang,'en');assert.equal(h.text.nodeValue,'Device info');assert.equal(h.label.attrs['aria-label'],'Keyboard RGB lighting');
  h.text.nodeValue='正在连接设备…';h.mutate();assert.equal(h.text.nodeValue,'Connecting…');
  h.select.value='zh';h.select.onchange();assert.equal(h.root.lang,'zh-CN');assert.equal(h.text.nodeValue,'正在连接设备…');assert.equal(h.label.attrs['aria-label'],'键盘 RGB 灯光');assert.equal(h.stored.value,'zh');
  h.select.value='en';h.select.onchange();assert.equal(h.text.nodeValue,'Connecting…');
  const sha='002a6d6af25d5ef4ac78ec116d0f28164d3669400790807e43be09b7076e2f62';assert.equal(h.context.RainyI18n.translate(sha),sha);assert.equal(h.context.RainyI18n.translate('firmware/bongocat/Rainy75V2_IPS_BongoCat_v1_3f_Sleep_Ear_Twitch_TEST.bin'),'firmware/bongocat/Rainy75V2_IPS_BongoCat_v1_3f_Sleep_Ear_Twitch_TEST.bin');
  assert.equal(harness('zh-TW').root.lang,'zh-CN');assert.equal(harness('fr-FR').root.lang,'en');assert.equal(harness('en-US','zh').root.lang,'zh-CN');
});
