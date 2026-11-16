(function(){
  'use strict';
  // Conservative support envelope for the legacy receiver application layout.
  // This is a tool limit, not a claim about the chip's physical Flash capacity.
  const BASE=0x2000,MAX=0xE000;
  function validate(bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length<256)throw Error('接收器 BIN 太小或为空');
    const size=Math.ceil(bytes.length/512)*512;
    if(size>MAX)throw Error('接收器 BIN 超出本工具当前支持范围（最大 56 KiB）');
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),jump=view.getUint32(0,true);
    if((jump&0xfff)!==0x6f)throw Error('不是受支持的接收器 RISC-V 应用 BIN，请勿选择屏幕或主控固件');
    let offset=((jump>>>31)<<20)|(((jump>>>12)&255)<<12)|(((jump>>>20)&1)<<11)|(((jump>>>21)&1023)<<1);
    if(offset&0x100000)offset-=0x200000;
    if(offset<0xA0||offset+2>bytes.length)throw Error('接收器启动入口不在应用镜像范围内');
    const handler=view.getUint32(12,true);
    if(handler!==0x200000A0)throw Error('接收器镜像布局与原工具支持的格式不符');
    const padded=new Uint8Array(size);padded.fill(255);padded.set(bytes);
    return {padded,originalLength:bytes.length,startAddress:BASE,entry:BASE+offset};
  }
  window.RainyReceiverBin={validate};
})();
