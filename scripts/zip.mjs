import {deflateRawSync} from 'node:zlib';
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zipFiles(files){
  const chunks=[],directory=[];let offset=0;
  if(files.length>65535)throw Error('Too many ZIP entries');
  for(const {name,data} of files){
    if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>!p||p==='..'||p==='.'))throw Error('Invalid ZIP path');
    const filename=Buffer.from(name),bytes=Buffer.from(data),compressed=deflateRawSync(bytes),crc=crc32(bytes);
    if(filename.length>65535||bytes.length>0xffffffff||offset>0xffffffff)throw Error('ZIP32 size exceeded');
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);
    chunks.push(header,filename,compressed);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);header.copy(central,6,4,30);central.writeUInt32LE(offset,42);directory.push(central,filename);offset+=header.length+filename.length+compressed.length;
  }
  const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...chunks,central,end]);
}
