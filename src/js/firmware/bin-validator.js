(function(){
'use strict';
const BASE=0x08004000,MAX_BYTES=0x08080000-BASE,PAGE=512;
function validateScreenBin(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<256)throw Error('BIN 太小或内容为空，不是完整的屏幕应用固件');
 const paddedLength=Math.ceil(bytes.length/PAGE)*PAGE;
 if(paddedLength>MAX_BYTES)throw Error('BIN 超出当前 Rainy75 V2 屏幕应用区域（最大 496 KiB），不能使用整片备份');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),stack=view.getUint32(0,true),reset=view.getUint32(4,true);
 if(stack<0x20000000||stack>0x20080000||stack%8)throw Error('初始堆栈地址无效，请选择原始屏幕应用 BIN');
 const executable=address=>!!(address&1)&&(address&0xFFFFFFFE)>=BASE&&(address&0xFFFFFFFE)<BASE+bytes.length;
 if(!executable(reset))throw Error('复位入口不在 0x08004000 起始的应用镜像内，可能是其他设备固件或整片备份');
 for(const index of [2,3,4,5,6,11,12,14,15]){const address=view.getUint32(index*4,true);if(address!==0&&!executable(address))throw Error('中断向量与当前屏幕应用地址不符');}
 const padded=new Uint8Array(paddedLength);padded.fill(255);padded.set(bytes);
 return {padded,originalLength:bytes.length,stack,reset};
}
// Exposed only for offline validation; no HID activity occurs here.
window.RainyScreenBin={validate:validateScreenBin};
})();
