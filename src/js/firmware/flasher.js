// Rainy75 V2 IPS and receiver flashing transport. Firmware bytes are supplied separately.
const FIRMWARE={rcv:{name:'2.4G 接收器',appPid:0x3071,iapPid:0x3070,startAddr:0x2000,version:'尚未选择固件',bootCmd:[0xbe,0xfc,4,0xed]},ips:{name:'IPS 彩屏',appPid:0x3075,iapPid:0x3078,startAddr:0x4000,version:'尚未选择固件',bootCmd:[0xbe,0xfc,5,0,0xed]}};
const VENDOR_ID = 0x36B0;
const USAGE_PAGE = 0xFF60;
const CMD_PROM = 0x80, CMD_ERASE = 0x81, CMD_VERIFY = 0x82, CMD_END = 0x83;
const REPORT_LEN = 64;      // IAP 接口报告固定 64 字节，短包必须补零，否则设备认为包不完整
const CHUNK = 62;           // 写入分片（64 - 2 字节头）
const CHUNK_VERIFY = 56;    // 校验分片（64 - 8，和官方 IAP 工具一致，不能写到 58）
const RETRY = 10;           // 同一小段连续失败的最大重试次数（和官方工具一致）
const RETRY_DELAY = 20;     // 重试间隔 ms
const ERASE_WAIT = 1200;    // 擦除应答回来后还要等这么久才能写（设备还在后台收尾）

let target = 'ips'; // Explicit target; never inferred from a filename.
let dev = null;          // HIDDevice
let running = false;
let cancelled = false;
let rxq = [];            // 已到达但还没被取走的应答（先进先出）
let rxWait = null;       // 正在等应答的那个 resolve
let outId = 0;           // 探测到的输出报告 ID
let outLen = 0;          // 探测到的输出报告长度

// ======================= 界面 =======================
function pick(which){if(running||!FIRMWARE[which])return;target=which;setStatus('待刷入：'+FIRMWARE[which].version);}

function setStatus(text, cls) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = cls === 'ok' ? '#1b7f3b' : cls === 'err' ? '#c0392b' : '#333';
}

function showBanner(text, cls) {
  const el = document.getElementById('banner');
  el.textContent = text;
  el.className = 'banner ' + (cls || 'ok');
}
function hideBanner() {
  const el = document.getElementById('banner');
  el.className = 'banner';
  document.title = 'RainyMurphy v1.01';
}

function setProgress(pct) {
  document.getElementById('barFill').style.width = pct + '%';
  document.getElementById('pct').textContent = Math.round(pct) + '%';
}

function log(text, cls) {
  const box = document.getElementById('log');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = text;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function NeedGesture(msg) { this.needGesture = true; this.message = msg; }
let pendingFlash = null;   

// ======================= WebHID =======================
async function requestDevice(productId, withUsagePage) {
  if (!navigator.hid) throw new Error('浏览器不支持 WebHID，请用 Chrome/Edge 89+');
  // 应用模式必须带 usagePage 0xFF60（和仓库里能用的消抖工具一致）：
  // 否则会列出 4 个接口，用户可能选到标准键盘接口 -> 写报告被拒
  const pids = Array.isArray(productId) ? productId : [productId];
  const filters = pids.map(p => withUsagePage
    ? { vendorId: VENDOR_ID, productId: p, usagePage: USAGE_PAGE }
    : { vendorId: VENDOR_ID, productId: p });
  const devices = await navigator.hid.requestDevice({ filters });
  if (!devices.length) { const e = new Error('没有选择设备'); e.userCancelled = true; throw e; }
  // 设备有多个 HID 接口，只有 usagePage 0xFF60 那个能发自定义报告。
  // 优先挑带 0xFF60 的；都带就选第一个。
  let d = devices.find(x => (x.collections || []).some(c => c.usagePage === USAGE_PAGE));
  if (!d) {
    d = devices[0];
    log('警告：选中的接口不是 0xFF60，可能无法下发命令', 'warn');
  }
  if (!d.opened) await d.open();
  d.addEventListener('inputreport', onReport);
  return d;
}

function keyByIapPid(pid) {
  for (const k of ['ips','rcv']) {
    if (FIRMWARE[k].iapPid === pid) return k;
  }
  return null;
}

async function findByPid(productId) {
  if (!navigator.hid) return null;
  const list = await navigator.hid.getDevices();
  const matches=list.filter(d=>d.vendorId===VENDOR_ID&&d.productId===productId);
  if(matches.length>1)return null;
  return matches[0]||null;
}

function onReport(e) {
  const data = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
  if (rxWait) { const w = rxWait; rxWait = null; w.resolve(data); }
  else if (rxq.length < 8192) rxq.push(data);   // 流水线写入时先排队，不能丢
}

// 取一个应答（先进先出）。超时抛异常。
function nextReport(timeoutMs) {
  if (rxq.length) return Promise.resolve(rxq.shift());
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (rxWait) { rxWait = null; reject(new Error('应答超时')); }
    }, timeoutMs || 5000);
    rxWait = { resolve: (d) => { clearTimeout(t); resolve(d); } };
  });
}

// 列出这台设备所有输出报告（报告 ID + 字节数），大的排前面。
// 键盘 0xFF60 是 256 字节，IAP 是 64 字节，屏幕又是另一套，所以不能写死。
function outReports(d) {
  const list = [];
  for (const c of (d && d.collections) || []) {
    for (const r of (c.outputReports || [])) {
      let bits = 0;
      for (const it of (r.items || [])) bits += (it.reportCount || 0) * (it.reportSize || 0);
      const len = Math.ceil(bits / 8);
      if (len > 0) list.push({ id: r.reportId || 0, len: len });
    }
  }
  list.sort((a, b) => b.len - a.len);
  return list;
}

// 发一包。报告 ID 和长度都按设备自己的描述符来，逐个试，通了就记住。
async function sendPkt(bytes) {
  const n = bytes.length;
  const cand = [];
  const add = (id, len) => {
    if (len < n) return;                      // 报告装不下这一包就不试
    if (cand.some(x => x.id === id && x.len === len)) return;
    cand.push({ id: id, len: len });
  };
  if (outLen) add(outId, outLen);             // 上次成功的优先
  for (const r of outReports(dev)) add(r.id, r.len);
  add(0, REPORT_LEN);
  add(0, n);

  let lastErr = null;
  for (const c of cand) {
    const buf = new Uint8Array(c.len);
    buf.set(bytes.subarray(0, Math.min(n, c.len)));
    try {
      await dev.sendReport(c.id, buf);
      outId = c.id;
      outLen = c.len;
      return;
    } catch (e) { lastErr = e; }
  }
  const tried = cand.map(c => 'id' + c.id + '/' + c.len + 'B').join(' ');
  throw new Error('无法向设备发送数据（' +
    (lastErr && lastErr.message ? lastErr.message : '未知原因') +
    '；已试 ' + tried + '）');
}

function hex2(v) { return '0x' + (v & 0xff).toString(16).padStart(2, '0'); }

function hex32(v) { return '0x' + (v >>> 0).toString(16).toUpperCase().padStart(4, '0'); }

// 换设备/换阶段时把残留应答清掉，免得把上一阶段的应答当成擦除应答；
// 顺手按新设备的报告长度重新算 outLen
function resetRx() { rxq = []; rxWait = null; outId = 0; outLen = 0; }

// 判定应答：WCH IAP 成功时返回 00 00
function replyOk(rep) {
  return !!rep && rep.length >= 2 && rep[0] === 0x00 && rep[1] === 0x00;
}

function replyText(rep) {
  if (!rep) return '无应答';
  if (rep.length < 2) return '应答过短（' + rep.length + ' 字节）';
  return hex2(rep[0]) + ' ' + hex2(rep[1]);
}

// 单包命令：发一次收一次应答，失败重试（tries 可单独压小，别让界面像卡死）
async function cmdOk(pkt, timeoutMs, tries) {
  const n = (tries === undefined || tries === null) ? RETRY : tries;
  let last = '无应答';
  for (let attempt = 0; attempt <= n; attempt++) {
    if (cancelled) throw new Error('已取消');
    await sendPkt(pkt);
    try {
      const rep = await nextReport(timeoutMs || 5000);
      if (replyOk(rep)) return;
      last = replyText(rep);
    } catch (e) { last = e.message; }
    await sleep(RETRY_DELAY);
  }
  throw new Error('设备返回 ' + last);
}

// ======================= IAP 流程 =======================
function u32(addr) {
  return [addr & 0xff, (addr >> 8) & 0xff, (addr >> 16) & 0xff, (addr >> 24) & 0xff];
}

function erasePkt(addr) {
  const p = new Uint8Array(6);
  p[0] = CMD_ERASE; p[1] = 0;
  p.set(u32(addr), 2);
  return p;
}

function promPkt(data, off, n) {
  const p = new Uint8Array(2 + n);
  p[0] = CMD_PROM; p[1] = n;
  p.set(data.subarray(off, off + n), 2);
  return p;
}

function verifyPkt(data, off, n, addr) {
  const p = new Uint8Array(6 + n);
  p[0] = CMD_VERIFY; p[1] = n;
  p.set(u32(addr), 2);
  p.set(data.subarray(off, off + n), 6);
  return p;
}

// 一包一发一应答：和官方工具一样 —— 发一包、等它自己的应答、再发下一包。
// 不做窗口、不做流水线：设备吃不下突发，一次多发几包它就不回应答了。
async function pipeline(build, total, unit, timeoutMs, startPct, endPct, verb, baseAddr) {
  let off = 0;
  let lastPct = -1;

  while (off < total) {
    if (cancelled) throw new Error('已取消');
    const n = Math.min(unit, total - off);
    const pkt = build(off, n);

    let ok = false;
    let last = '无应答';
    for (let attempt = 0; attempt <= RETRY; attempt++) {
      if (cancelled) throw new Error('已取消');
      try {
        await sendPkt(pkt);
        const rep = await nextReport(timeoutMs);
        if (replyOk(rep)) { ok = true; break; }
        last = replyText(rep);
      } catch (e) { last = e.message; }
      await sleep(RETRY_DELAY);
    }
    if (!ok) throw new Error(verb + '失败（地址 ' + hex32(baseAddr + off) + ' 附近）：' + last);

    off += n;
    const pct = startPct + (endPct - startPct) * off / total;
    if (pct - lastPct >= 0.5) { lastPct = pct; setProgress(pct); }
  }
  setProgress(endPct);
}

async function iapErase(addr) {
  log('  擦除中…');
  // 擦除应答要等近 2 秒；设备要是彻底没反应就别反复重试，直接报错
  await cmdOk(erasePkt(addr), 10000, 2);
  // 应答回来时擦除还在后台收尾，官方工具也是 sleep(1) 再写。
  // 注意：这里不能拿 VERIFY 去探"擦干净了没"——VERIFY 只有在
  // PROM 流用 0x80 0x00 收尾之后才被接受，提前发会回 0x35 这种错误码。
  await sleep(ERASE_WAIT);
  log('  擦除完成', 'ok');
}

async function iapWrite(data, addr, startPct, endPct) {
  log('  写入中…');            // 擦除完成之后紧跟这一条，别让日志空着
  await pipeline((o, n) => promPkt(data, o, n), data.length, CHUNK, 1500,
                 startPct, endPct, '写入', addr);
  // 收尾零包：告诉设备"写完了"，官方工具也这么做
  await cmdOk(promPkt(data, 0, 0), 5000, 3);
  log('  写入完成', 'ok');
}

async function iapVerify(data, addr, startPct, endPct) {
  // 和设备一致：最后不满一包的那几个字节不比（Python 版循环条件也是这么写的）
  const total = data.length - (data.length % CHUNK_VERIFY);
  await pipeline((o, n) => verifyPkt(data, o, n, addr + o), total, CHUNK_VERIFY, 1500,
                 startPct, endPct, '校验', addr);
  log('  校验通过', 'ok');
}

async function iapEnd() {
  // 结束命令设备不回状态，发完自己重启
  try { await sendPkt(Uint8Array.from([CMD_END, 0])); } catch (e) {}
  await sleep(400);
  log('  结束命令已发送', 'ok');
}
async function connectApp() {
  const fw = FIRMWARE[target];
  // 之前授权过就直接用，省掉每次弹窗
  let d = await findByPid(fw.appPid);
  if (d) {
    if (!d.opened) await d.open();
    d.addEventListener('inputreport', onReport);
    dev = d;
    resetRx();
    log('连接成功', 'ok');
    return;
  }
  log('请选择设备…（列表里也会显示已在升级模式/boot 的设备）');
  dev = await requestDevice([fw.appPid, fw.iapPid], false);
  if (dev.productId === fw.iapPid) {
    log('选中的是升级模式设备，直接开始烧录', 'ok');
  } else if (dev.productId !== fw.appPid) {
    throw new Error('选的设备不是「' + fw.name + '」');
  } else {
    log('连接成功', 'ok');
  }
  resetRx();
}

async function findBootDevice() {
  const seen = await navigator.hid.getDevices().catch(() => []);
  for (const key of [target]) {
    const fw = FIRMWARE[key];
    const matches = seen.filter(x => x.vendorId === VENDOR_ID && x.productId === fw.iapPid);
    const d = matches.length === 1 ? matches[0] : null;
    if (d) return { dev: d, key: key };
  }
  return null;
}

// 重新选一次设备（上一次烧录后设备会重启，浏览器手里那个对象可能已经失效了）
async function reconnectApp(fw) {
  try { if (dev) await dev.close(); } catch (e) {}
  dev = null;
  await sleep(400);
  log('  请选择设备…');
  dev = await requestDevice(fw.appPid, true);
  resetRx();
}

async function enterIap() {
  const fw = FIRMWARE[target];
  log('让设备进入升级模式…');
  // 屏幕走 0xbe fe 5 0 ed，键盘/接收器是 0xbe fc 4 ed
  const boot = Uint8Array.from(fw.bootCmd || [0xbe, 0xfc, 4, 0xed]);
  try {
    await sendPkt(boot);
  } catch (err) {
    // 这条命令发不出去，基本就是手里这个设备对象不对（失效的旧对象，
    // 或者 0x3075 上有键盘和屏幕两个设备取错了）——重新选一次再发
    log('  这个设备没响应，请重新选择…', 'warn');
    await reconnectApp(fw);
    await sendPkt(boot);
  }
  
  try { await dev.close(); } catch (e) {}
  dev = null;
  await sleep(300);          

  // 已授权的 IAP 设备（第二次以后）
  for (let i = 0; i < 5; i++) {
    if(cancelled)throw new Error('已取消');
    const d = await findByPid(fw.iapPid);
    if (d) {
      if (!d.opened) await d.open();
      d.addEventListener('inputreport', onReport);
      dev = d;
      resetRx();
      log('已进入升级模式', 'ok');
      return;
    }
    await sleep(120);
  }

  
  for (let i = 0; i < 20; i++) {            
    if (!(await findByPid(fw.appPid))) break;
    await sleep(100);
  }
  
  for (let i = 0; i < 60; i++) {
    if(cancelled)throw new Error('已取消');
    const d = await findByPid(fw.iapPid);
    if (d) {
      if (!d.opened) await d.open();
      d.addEventListener('inputreport', onReport);
      dev = d;
      resetRx();
      log('已进入升级模式', 'ok');
      return;
    }
    await sleep(100);
  }

  
  log('请在弹出的窗口里选择“升级模式”设备…', 'warn');
  try {
    const d2 = await requestDevice(fw.iapPid, false);
    if (d2 && d2.productId === fw.iapPid) {
      dev = d2;
      resetRx();
      log('已进入升级模式', 'ok');
      return;
    }
    try { if (d2) await d2.close(); } catch (e) {}
    throw new Error('选的不是升级模式设备');
  } catch (err) {
    if (err && err.name === 'NotFoundError') throw err;      
    
    log('这次没选中设备（' + (err.message || err) + '）', 'warn');
  }

  
  pendingFlash = fw;
  log('设备已经在升级模式了，但浏览器还没授权过它 —— 点下面的【选择设备并继续】即可', 'warn');
  throw new NeedGesture('设备已进入升级模式，点【选择设备并继续】在弹窗里选它');
}

async function start() {
  if (window.RainyScreenManager?.isConnected() || window.RainyScreenManager?.isBusy()) { alert("请先断开动画管理的连接，再开始烧录。"); return; }
  if (running) return;
  
  if (!target) {
    try {
      const allPids = [];
      for (const k of ['ips','rcv']) {
        allPids.push(FIRMWARE[k].appPid, FIRMWARE[k].iapPid);
      }
      const d = await requestDevice(allPids, false);
      const key = keyByIapPid(d.productId)
               || Object.keys(FIRMWARE).find(key=>FIRMWARE[key].appPid===d.productId);
      if (!key) {
        try { await d.close(); } catch (e) {}
        alert('这个设备无法识别，请先点上面的卡片选择要烧哪台');
        return;
      }
      pick(key);
      dev = d;
      resetRx();
      log('已选设备：' + FIRMWARE[key].name + (d.productId === FIRMWARE[key].iapPid ? '（升级模式）' : ''));
    } catch (e) {
      if (e && e.name !== 'NotFoundError') log('选择设备失败：' + e.message, 'err');
      return;
    }
  }
  const fw = FIRMWARE[target];
  running = true;
  cancelled = false;
  rxq = []; rxWait = null; outId = 0; outLen = 0;
  document.getElementById('btnStart').disabled = true;
  { const b = document.getElementById('btnStart');
    b.textContent = '开始烧录';
    b.classList.remove('needpick'); }
  document.getElementById('btnCancel').disabled = false;
  setProgress(0);
  hideBanner();
  log('==== 开始烧录：' + fw.name + ' 固件 ' + fw.version + ' ====');

  try {
    const data = window.RainyFirmwareSource.bytesFor(fw);
    log('固件已就绪');

    if(dev&&dev.productId!==fw.appPid&&dev.productId!==fw.iapPid){try{await dev.close();}catch{}dev=null;}
    if (!dev) {
      
      const boot = await findBootDevice();
      if (boot && boot.key === target) {
        dev = boot.dev;
        if (!dev.opened) await dev.open();
        dev.addEventListener('inputreport', onReport);
        resetRx();
        log('检测到已在升级模式的设备，直接开始烧录', 'ok');
      } else {
        await connectApp();
      }
    }

    // 已经是升级模式就直接烧，否则先切过去
    const isIap = dev.productId === fw.iapPid;
    if (!isIap) await enterIap();
    else log('已进入升级模式', 'ok');
    if (!dev) throw new Error('升级模式设备未连接');

    setProgress(1);
    resetRx();                           // 进升级模式时残留的应答不能算作擦除应答
    await iapErase(fw.startAddr);
    setProgress(6);
    await iapWrite(data, fw.startAddr, 6, 80);
    await iapVerify(data, fw.startAddr, 82, 98);
    await iapEnd();
    window.RainyConnection?.markFlashSuccess();
    pendingFlash = null;
    setProgress(100);
    setStatus(fw.name + ' 烧录成功 ✓', 'ok');
    showBanner('✅ ' + fw.name + ' 烧录成功 —— 固件 ' + fw.version, 'ok');
    document.title = '✓ 烧录成功 · ' + fw.name;
    log('**** 烧录成功', 'ok');
  } catch (e) {
    if (e && e.needGesture) {
      
      const b = document.getElementById('btnStart');
      b.textContent = '选择设备并继续';
      b.classList.add('needpick');
      setStatus('设备已进入升级模式 —— 点【选择设备并继续】在弹窗里选它', 'warn');
      pendingFlash = pendingFlash || fw;
    } else {
      setStatus('烧录失败：' + e.message, 'err');
      showBanner('❌ 烧录失败：' + e.message + '（可再点一次“开始烧录”重试）', 'err');
      log('**** 失败：' + e.message, 'err');
      pendingFlash = null;
    }
  } finally {
    running = false;
    document.getElementById('btnStart').disabled = false;
      document.getElementById('btnCancel').disabled = !pendingFlash;
    if (!pendingFlash) {
      try { if (dev) await dev.close(); } catch (e) {}
      dev = null;
    }
  }
}

async function cancel() {
  cancelled = true;
  if(!running&&pendingFlash){
    pendingFlash=null;
    try{if(dev)await dev.close();}catch{}
    dev=null;resetRx();document.getElementById('btnCancel').disabled=true;
    window.RainyConnection?.refreshUi();
  }
  log('已请求取消…', 'warn');
}

pick('ips');
