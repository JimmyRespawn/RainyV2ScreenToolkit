import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { root,collectCatalogs } from './catalog.mjs';

const port=Number(process.env.PORT||4173),built=process.argv.includes('--dist'),source=path.join(root,built?'dist':'src');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.bin':'application/octet-stream','.png':'image/png','.gif':'image/gif'};
let cache=null,cacheTime=0;
async function localCatalogs(){if(!cache||Date.now()-cacheTime>1000){cacheTime=Date.now();cache=collectCatalogs({includeLocal:!process.env.CI}).catch(error=>{cache=null;throw error;});}return cache;}
const server=http.createServer(async(request,response)=>{
  try{
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname),parts=pathname.split('/').filter(Boolean);
    if(parts.some(part=>part.startsWith('.')||part==='..')||pathname.includes('\\'))throw Error('Invalid path');
    if(!built&&['/firmware/official/catalog.json','/marketplace/catalog.json'].includes(pathname)){
      try{
        const catalogs=await localCatalogs(),data=pathname.startsWith('/marketplace/')?catalogs.marketplace:catalogs.official;
        response.writeHead(200,{'Content-Type':mime['.json'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:JSON.stringify(data));
      }catch(error){console.error('Catalog validation failed:',error);response.writeHead(500,{'Content-Type':mime['.json'],'Cache-Control':'no-store'});response.end(JSON.stringify({error:error.code==='ENOENT'?'清单引用的文件不存在，请检查 BIN 与预览文件名':error.message}));}
      return;
    }
    const catalog=!built&&(pathname.startsWith('/firmware/official/')||pathname.startsWith('/marketplace/')||pathname.startsWith('/firmware/bongocat/')||pathname.startsWith('/firmware/local/'));
    if(catalog&&!(await localCatalogs()).assets.includes(pathname.slice(1)))throw Error('Asset is not listed in a catalog');
    const base=catalog?root:source,file=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(base+path.sep))throw Error('Invalid path');
    const real=await fs.realpath(file);if(real!==file)throw Error('Symlinks are not served');
    if(catalog&&!/\.(json|bin|png|gif)$/i.test(file))throw Error('Unsupported catalog resource');
    const bytes=await fs.readFile(file);response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:bytes);
  }catch{response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。若本地服务已经启动，请直接打开 http://127.0.0.1:${port}；否则关闭旧服务后重试。`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${port}`;console.log(`RainyMurphy: ${url}`);
  if(process.argv.includes('--open')){
    const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
    const browser=spawn(command,[url],{stdio:'ignore',detached:true,windowsHide:true});browser.on('error',()=>console.log('请手动在 Chrome / Edge 打开 '+url));browser.unref();
  }
});
