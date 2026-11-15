import test from 'node:test';import assert from 'node:assert/strict';
import { checkProject } from '../scripts/check.mjs';import { validateEntry } from '../scripts/catalog.mjs';

test('standalone sources resolve assets and publish only cataloged firmware',async()=>{const result=await checkProject();assert(result.sourceFiles>10);assert(result.firmwareFiles.every(file=>file.startsWith('marketplace/')||file.startsWith('firmware/official/')));});
test('catalog paths cannot escape their namespace or omit distribution metadata',()=>{
  const entry={id:'test-theme',name:'Theme',version:'1',author:'Test',description:'Test fixture',target:'rainy75v2-ips',startAddress:'0x08004000',file:'marketplace/test-theme/firmware.bin',bytes:4099,sha256:'0'.repeat(64),license:'MIT',sourceUrl:'https://example.com/project',hardwareTested:false,redistributionAllowed:true,preview:{width:320,height:172,type:'simulation',cover:'marketplace/test-theme/cover.png',animation:'marketplace/test-theme/preview.gif'}};
  assert.equal(validateEntry(entry,'marketplace'),entry);
  for(const invalid of [{file:'marketplace/../../private.bin'},{file:'firmware/official/other.bin'},{file:'https://example.com/file.bin'},{redistributionAllowed:false},{sha256:'invalid'},{target:'keyboard-controller'}])assert.throws(()=>validateEntry({...entry,...invalid},'marketplace'));
  assert.throws(()=>validateEntry({...entry,preview:{...entry.preview,height:180}},'marketplace'));
  assert.throws(()=>validateEntry({...entry,preview:{...entry.preview,cover:'marketplace/../private.png'}},'marketplace'));
});
