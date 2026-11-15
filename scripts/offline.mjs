import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {root,collectCatalogs} from './catalog.mjs';
import {checkProject} from './check.mjs';
import {zipFiles} from './zip.mjs';

const local=process.argv.includes('--include-local');
if(local&&process.env.CI)throw Error('Local-only firmware cannot be packaged in CI');
await checkProject();
const catalogs=await collectCatalogs({includeLocal:local}),assets={};
const source=path.join(root,'src');
const dataURL=async(file,mime)=>'data:'+mime+';base64,'+(await fs.readFile(file)).toString('base64');
for(const file of catalogs.assets.filter(file=>!file.endsWith('.bin')))assets[file]=await dataURL(path.join(root,file),file.endsWith('.gif')?'image/gif':'image/png');
let html=await fs.readFile(path.join(source,'index.html'),'utf8');
for(const match of [...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)">/g)])html=html.replace(match[0],'<style>\n'+(await fs.readFile(path.join(source,match[1]),'utf8')).replace(/<\/style/gi,'<\\/style')+'\n</style>');
for(const file of ['icon.svg','keyboard.svg'])html=html.replaceAll('./assets/'+file,await dataURL(path.join(source,'assets',file),'image/svg+xml'));
const bootstrap={local,catalogs:{'firmware/official':catalogs.official,marketplace:catalogs.marketplace},assets};
const json=JSON.stringify(bootstrap).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const scripts=['window.RainyOffline='+json+';'];
for(const match of [...html.matchAll(/<script defer src="\.\/([^"]+)"><\/script>/g)]){scripts.push(await fs.readFile(path.join(source,match[1]),'utf8'));html=html.replace(match[0],'');}
for(const script of scripts)new vm.Script(script);
html=html.replace('</body>',scripts.map(code=>'<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')+'\n</body>');
if(/<script[^>]+src=|<link rel="stylesheet"/.test(html))throw Error('Offline resources were not fully bundled');
const instructions=`RainyMurphy 离线版\r\n\r\n1. 完整解压本压缩包。\r\n2. 使用桌面 Chrome / Edge 打开 RainyMurphy.html，无需安装 Node 或启动脚本。\r\n3. 社区主题可直接浏览静态图和动画预览。选用主题时，请选择解压目录中提示的 BIN 文件；网页会核对大小与 SHA-256。\r\n4. 也可在“关于”中选择自己的屏幕 BIN。选择文件不会自动烧录。\r\n5. 连接设备后，确认固件与风险，再点击“开始烧录”。刷写时保持有线连接与供电。\r\n\r\nBIN 保持独立文件，未嵌入 HTML。仅支持 Rainy75 V2 IPS 屏幕原始应用 BIN。\r\n${local?'此包含私有本地测试主题，请勿作为公开开源发行包上传。\r\n':''}`;
const files=[{name:'RainyMurphy.html',data:html},{name:'使用说明.txt',data:instructions},{name:'LICENSE',data:await fs.readFile(path.join(root,'LICENSE'))}];
for(const name of catalogs.assets.filter(file=>file.endsWith('.bin')))files.push({name,data:await fs.readFile(path.join(root,name))});
const release=path.resolve(root,'release'),name='RainyMurphy-offline'+(local?'-local':'');
await fs.mkdir(release,{recursive:true});
let archive=name+'.zip';const bytes=zipFiles(files);
try{await fs.writeFile(path.join(release,archive),bytes);}catch(error){
  if(!['EBUSY','EPERM'].includes(error.code))throw error;
  archive=name+'-'+Date.now()+'.zip';await fs.writeFile(path.join(release,archive),bytes);
}
console.log(`Created release/${archive} (${files.length} files; ${local?'LOCAL ONLY':'public'})`);
