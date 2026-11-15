import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
test('appearance follows system changes, remembers overrides, and tolerates unavailable storage',async()=>{
  const code=await fs.readFile(new URL('../src/js/ui/appearance.js',import.meta.url),'utf8');
  for(const unavailable of [false,true]){
    const root={dataset:{},style:{}},select={},system={matches:true,addEventListener:(_,callback)=>system.change=callback};let stored;
    const storage={getItem(){if(unavailable)throw Error('denied');return stored;},setItem(_,value){if(unavailable)throw Error('denied');stored=value;}};
    vm.runInNewContext(code,{window:{matchMedia:()=>system},document:{documentElement:root,readyState:'complete',getElementById:()=>select},localStorage:storage});
    assert.equal(root.dataset.theme,'dark');system.matches=false;system.change();assert.equal(root.dataset.theme,'light');
    select.value='dark';select.onchange();system.change();assert.equal(root.dataset.theme,'dark');if(!unavailable)assert.equal(stored,'dark');
    select.value='auto';select.onchange();assert.equal(root.dataset.theme,'light');
  }
});
