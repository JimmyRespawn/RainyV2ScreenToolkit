import test from 'node:test';import assert from 'node:assert/strict';
import {createHarness,syntheticBin} from './helpers/harness.mjs';
test('source choices show one panel, preserve confirmed firmware, and discard unconfirmed drafts',async()=>{
 const h=await createHarness(),{ctx,get,state}=h,source=ctx.RainyFirmwareSource;
 assert.equal(source.getSource(),'community');assert.equal(get('fw-community-panel').hidden,false);assert.equal(get('fw-custom-panel').hidden,true);
 source.selectSource('custom');assert.equal(get('fw-custom-panel').hidden,false);assert.equal(get('fw-community-panel').hidden,true);
 await h.selectBin();const hash=source.getSelection().sha256;
 source.selectSource('community');assert.equal(source.getSelection().sha256,hash);assert.equal(state.flashes,0);
 source.selectSource('custom');const bytes=syntheticBin();get('fw-file').files=[{name:'new.bin',size:bytes.length,arrayBuffer:async()=>bytes.buffer}];await get('fw-file').onchange();
 assert.equal(get('btnStart').disabled,true);
 await ctx.start();
 assert.equal(state.flashes,0,'an unconfirmed replacement must not flash the previously selected file');
 source.selectSource('community');
 assert.equal(get('btnStart').disabled,false);get('fw-confirm').checked=true;get('fw-apply').onclick();assert.equal(source.getSelection().sha256,hash);
 source.selectTarget('rcv');assert.equal(source.getSource(),'custom');assert.equal(get('fw-community-option').hidden,true);assert.equal(get('fw-custom-panel').hidden,false);assert.throws(()=>source.selectSource('community'));
 source.selectTarget('ips');assert.equal(source.getSource(),'community');assert.equal(get('fw-community-option').hidden,false);assert.equal(state.flashes,0);
});
