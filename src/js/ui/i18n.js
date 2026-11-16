(function(){
  'use strict';
  // Keep transport messages in their original form. Translate only presentation text.
  const dictionary={
    '固件来源':'Firmware source','自定义 BIN':'Custom BIN','选择社区主题':'Choose a community theme','浏览社区主题':'Browse community themes',
    '浏览封面与动画预览，选择喜欢的屏幕主题':'Browse covers and animations to choose a screen theme','选择自己准备的固件文件':'Choose your own firmware file',
    '查看主题预览，确认后加载对应固件。社区主题仅适用于 IPS 屏幕。':'Preview a theme and confirm its firmware. Community themes are for the IPS screen only.',
    '当前目标不支持此固件来源':'This firmware source is not available for the selected target',
    '主题目录读取失败，请展开下方“查看原因”；也可以选择“自定义 BIN”加载本地固件。':'Could not read the theme catalog. Expand Show details below, or select Custom BIN to load a local file.',
    '暂未收录主题，可选择“自定义 BIN”加载本地固件。':'No themes listed yet. Select Custom BIN to load a local file.',
    '刷写目标':'Flash target','IPS 屏幕':'IPS screen','2.4G 接收器':'2.4 GHz receiver',
    '先选择目标，再选择对应的原始 BIN。文件只在本地读取，不会上传。':'Select a target, then its raw application BIN. Files are read locally and never uploaded.',
    '选择接收器固件':'Select receiver firmware','选择接收器 BIN':'Choose receiver BIN','请先选择对应目标的 BIN':'Select a BIN for the chosen target',
    '我确认这是适用于 Rainy75 V2 2.4G 接收器、写入偏移为 0x2000 的原始应用 BIN，不是屏幕、键盘主控固件或整片备份。我已知晓刷写可能导致接收器无法使用，并自愿承担风险及后果。':'I confirm this is a raw Rainy75 V2 2.4 GHz receiver application BIN for offset 0x2000, not screen/controller firmware or a full Flash backup. I understand flashing may make the receiver unusable and accept the risks and consequences.',
    '请将目标接收器直接插入电脑，关闭官方驱动，刷写时保持连接与供电。仅限原工具支持的接收器格式，版本以文件提供者说明为准。':'Plug the target receiver directly into the computer, close the official driver, and keep it connected and powered. Only the legacy receiver layout is supported. Refer to the file provider for its version.',
    '接收器刷写 · 正常 PID 3071 / BOOT PID 3070 · 偏移 0x2000':'Receiver flash · Normal PID 3071 / BOOT PID 3070 · Offset 0x2000',
    '可浏览屏幕主题，或在本页选择本地 BIN':'Browse screen themes or choose a local BIN on this tab',
    '请先选择目标并加载对应的 BIN。':'Select a target and load its BIN first.','正在检查所选 BIN…':'Checking the selected BIN…',
    '请先选择有效且与当前目标一致的 BIN':'Select a valid BIN matching the current target first','请先完成或取消当前 BOOT 授权':'Complete or cancel the current BOOT authorization first','无效的刷写目标':'Invalid flash target',
    '正在烧录接收器固件…':'Flashing receiver firmware…','连接正交由烧录流程管理，请保持设备连接':'Flashing is managing the connection. Keep the device connected.',
    '接收器 BIN 太小或为空':'Receiver BIN is empty or too small','接收器 BIN 超出本工具当前支持范围（最大 56 KiB）':'Receiver BIN exceeds this tool’s supported range (56 KiB maximum)',
    '不是受支持的接收器 RISC-V 应用 BIN，请勿选择屏幕或主控固件':'Not a supported receiver RISC-V application BIN. Do not select screen or keyboard-controller firmware.',
    '接收器启动入口不在应用镜像范围内':'Receiver entry point is outside the application image','接收器镜像布局与原工具支持的格式不符':'Receiver layout does not match the legacy tool’s supported format',
    '此处显示准备刷入的文件，不代表设备当前已安装的版本。可在本页更换固件。':'This is the file to be flashed, not the version currently installed. Change firmware on this tab.',
    '此开源版不内置固件，请在固件烧录页选择目标和对应 BIN。':'No firmware is bundled. Select a target and its BIN on the Flash firmware tab.',
    '连接、灯光和动画管理无需加载固件。需要升级屏幕或接收器时，在固件烧录页选择目标和对应的原始应用 BIN。文件不会上传，也不会跨页面会话保存。':'Connection, lighting and animations work without firmware. To update the screen or receiver, select a target and its raw application BIN on the Flash firmware tab. Files are not uploaded or retained across page sessions.',
    '外观':'Appearance','页面外观':'Appearance','跟随系统':'System','浅色':'Light','暗色':'Dark','自动':'Auto',
    '屏幕固件 · 动画管理 · 设备信息':'Screen firmware · Animations · Device info',
    '尚未连接设备':'No device connected','未连接设备':'No device connected','连接设备':'Connect device','更换设备':'Change device','断开':'Disconnect','重新连接':'Reconnect','切换 USB':'Switch to USB',
    '连接一次，即可使用设备信息、灯光和动画管理。':'Connect once to access device info, lighting and animations.',
    '基础信息':'Device info','屏幕动画管理':'Screen animations','固件烧录':'Flash firmware','关于':'About','工具功能':'Tools',
    '社区主题与固件目录':'Community themes & firmware','社区主题':'Community themes','待刷入固件':'Selected firmware','尚未选择固件':'No firmware selected','请先选择屏幕 BIN':'Select a screen BIN first',
    '目标设备':'Target device','IPS 彩屏':'IPS screen','固件版本':'Firmware version','文件大小':'File size','写入大小':'Write size','SHA-256 文件指纹':'SHA-256 fingerprint',
    '烧录需要 USB 有线连接':'Flashing requires a USB cable',
    '此处显示准备刷入的文件，不代表设备当前已安装的版本。可在「关于」中更换固件。':'This is the file to be flashed, not the version currently installed. Change firmware in About.',
    '请确认有线连接至设备，并确保刷写时不断连，设备不断电':'Connect the device by USB and keep it connected and powered throughout flashing.',
    '开始烧录':'Start flashing','取消':'Cancel','请先在「关于」中选择屏幕 BIN。':'Select a screen BIN in About first.','烧录进度':'Flash progress','烧录日志':'Flash log',
    '读取四个壁纸槽位，删除不需要的图片或动画。':'Read the four wallpaper slots and remove unwanted images or animations.',
    '先关闭官方驱动页，用 USB 数据线连接键盘。这里无需刷固件。删除会清除所选壁纸中的 GIF 和 BIN；请保留原始素材以便重新上传。':'Close the official driver page and connect the keyboard by USB. No firmware flashing is needed. Deleting a wallpaper removes its GIF and BIN files; keep the originals to upload them again.',
    '刷新槽位':'Refresh slots','尚未读取设备，四个槽位的内容未知。':'The device has not been read. All four slots are unknown.',
    '删除后，正常切换页面会跳过空槽位。官方云朵页不在此处管理。':'Empty slots are skipped when switching pages. The built-in cloud page is not managed here.',
    '通信记录':'Communication log','导出日志':'Export log','删除壁纸':'Delete wallpaper','删除后本工具无法撤销，需要用官方驱动重新上传原始素材。':'This cannot be undone here. Use the official driver to upload the original files again.',
    '我确认清空这一页的全部素材':'I confirm deleting all files on this page','确认删除':'Confirm deletion','保留素材':'Keep files',
    'Rainy75 V2 键盘布局示意图':'Rainy75 V2 keyboard layout','电池电量':'Battery','充电状态':'Charging status','等待读取':'Waiting for data','键盘灯光':'Keyboard lighting','未读取':'Not read','键盘 RGB 灯光':'Keyboard RGB lighting','刷新信息':'Refresh info','支持 USB 有线和 2.4GHz 接收器':'Supports USB and the 2.4 GHz receiver',
    '最近更新 · ':'Last updated · ','预计续航 · ':'Estimated runtime · ','设备详情':'Device details','设备名称':'Device name','设备标识':'Device ID','未连接':'Disconnected',
    '无线时请选择接收器并唤醒键盘。请先关闭官网驱动页面，使用顶部统一连接；刷写固件时连接会自动交接。续航为粗略理论估算：10000mAh、1kHz、RGB 关闭，假设整机平均电流 20–50mA（并非实测），满电约 200–500 小时，再按当前电量折算。彩屏亮度、休眠、电池损耗及电量误差尚未校准；开启 RGB 后此估算不适用。':'For wireless use, select the receiver and wake the keyboard. Close the official driver page and use the connection bar above. The connection is handed over automatically for flashing. Runtime is a rough theoretical estimate: 10,000 mAh, 1 kHz, RGB off, assumed average draw of 20–50 mA (not measured), giving about 200–500 hours at full charge, scaled to the current battery level. Screen brightness, sleep, battery wear and reporting errors are not calibrated. This estimate does not apply with RGB on.',
    '开源网页工具':'Open-source web tool','适用设备':'Supported device','固件分发':'Firmware distribution','与网页解耦，默认不附带 BIN':'Separate from the web app; no BIN included by default','源码许可':'Source license','固件保留各自许可':'Firmware retains its own license','运行方式':'Run with','或 localhost':'or localhost',
    '连接、灯光和动画管理无需加载固件。需要升级屏幕时，自行选择正确的 IPS 应用 BIN。文件不会上传，也不会跨页面会话保存。':'Connection, lighting and animation management work without a firmware file. To update the screen, select the correct IPS application BIN. Files are not uploaded or retained across page sessions.',
    '选择屏幕固件':'Select screen firmware','当前固件':'Current firmware','选择屏幕 BIN':'Choose screen BIN','清除所选固件':'Clear selection','尚未选择外部文件':'No external file selected',
    '我确认这是适用于 Rainy75 V2 IPS 彩屏、以 0x08004000 为起始地址的原始应用 BIN，不是主控／接收器固件或整片 Flash 备份。我已知晓刷写外部固件可能导致设备无法正常使用或硬件损坏，并自愿承担由此产生的风险及后果。':'I confirm this is a raw application BIN for the Rainy75 V2 IPS screen starting at 0x08004000, not keyboard/receiver firmware or a full Flash backup. I understand that flashing external firmware may make the device unusable or damage hardware, and I accept the resulting risks and consequences.',
    '我确认这是适用于 Rainy75 V2 IPS 彩屏的固件。我已知晓刷写外部固件可能导致设备无法正常使用或硬件损坏，并自愿承担由此产生的风险及后果。':'I confirm this firmware is for the Rainy75 V2 IPS screen. I understand that flashing external firmware may make the device unusable or damage hardware, and I accept the resulting risks and consequences.',
    '使用所选固件':'Use selected firmware','此开源版不内置固件，请自行选择正确的屏幕 BIN。':'This open-source version includes no firmware. Select the correct screen BIN.',
    '选择文件不会自动烧录。结构检查不能确认固件的硬件兼容性或来源；SHA-256 只用于核对文件指纹。刷新后清空选择。':'Selecting a file does not flash it. Structural checks cannot confirm hardware compatibility or provenance; SHA-256 only identifies the file. Reloading clears the selection.',
    '浏览同屏幕比例的静态封面与动画预览，选用后核对文件，再由你点击开始烧录。':'Browse covers and animations at the screen aspect ratio. Verify the selected file, then click Start flashing.',
    '浏览主题':'Browse themes','刷新':'Refresh','关闭社区主题':'Close community themes','关闭':'Close','正在准备主题目录…':'Preparing the theme catalog…','请使用本地服务打开':'Open through a local server',
    '双击 HTML 的 ':'Opening the HTML using ',' 方式无法读取社区目录和 BIN，这不是固件文件损坏。':' cannot read the catalog or BIN files. This does not mean the firmware is damaged.',
    '在 RainyMurphy 文件夹双击 ':'In the RainyMurphy folder, double-click ','，会启动本地服务并自动打开浏览器（需要 Node.js 20+）。使用期间保留服务窗口。':' to start a local server and open the browser (Node.js 20+ required). Keep the server window open.',
    '也可在项目目录运行 ':'Alternatively, run ','，然后访问 ':' in the project folder, then visit ',
    '本机私有主题仍不会上传；在线版正常使用 HTTPS 地址即可。':'Private local themes are not uploaded. For the online version, use its HTTPS URL.',
    '查看原因':'Show details','使用并返回烧录':'Use and return to flashing','此工具需要启用 JavaScript。':'JavaScript is required.',
    '等待烧录授权':'Waiting for flash authorization','正在操作设备…':'Device operation in progress…','连接需要重试':'Connection needs retrying','USB 有线 · 已连接':'USB · Connected','2.4G 接收器 · 已连接':'2.4 GHz receiver · Connected',
    '请使用支持 WebHID 的 Chrome 或 Edge':'Use Chrome or Edge with WebHID support','连接正交由屏幕烧录流程管理，请保持有线连接':'Flashing is managing the connection. Keep the USB cable connected.',
    '请点击烧录页的“选择设备并继续”完成授权':'Click “Select device and continue” on the flash tab to authorize the device.',
    '设备信息、灯光和动画管理共用此连接':'Device info, lighting and animations share this connection','可读取电量、控制灯光；动画管理和烧录需要 USB':'Battery and lighting are available; animations and flashing require USB.',
    '点击连接即可；已授权的单台设备会直接重连，无需重复选择。':'Click Connect. A single authorized device reconnects without another selection.',
    '请选择 Rainy75 V2 键盘或接收器':'Select the Rainy75 V2 keyboard or receiver','设备正在操作，请稍候':'A device operation is in progress. Please wait.',
    '请先点击顶部“连接设备”':'Click Connect device at the top first','上次通信未确认，请点击顶部“重新连接”':'The last operation was not confirmed. Click Reconnect at the top.',
    '上次通信结果未确认，请点击“重新连接”后再试。':'The last operation was not confirmed. Reconnect before trying again.',
    '请先完成当前设备操作':'Complete the current device operation first','正在连接 USB 键盘…':'Connecting to the USB keyboard…','正在连接设备…':'Connecting…','正在断开…':'Disconnecting…',
    '已取消 USB 设备选择，尚未开始烧录':'USB selection cancelled. Flashing has not started.','正在交接烧录连接…':'Handing over the connection for flashing…','正在烧录屏幕固件…':'Flashing screen firmware…',
    '校验失败':'Verification failed','屏幕写入失败':'Screen write failed','屏幕忙':'Screen busy','存储空间不足':'Not enough storage','参数错误':'Invalid parameter','槽位为空':'Slot is empty','屏幕文件系统未就绪':'Screen file system is not ready','未检测到 IPS 屏幕':'IPS screen not detected','无效的槽位命令':'Invalid slot command','屏幕应答格式不匹配':'Unexpected screen response format','屏幕应答校验失败':'Screen response checksum failed','文件列表格式错误':'Invalid file list format','文件列表数量不匹配':'File list count mismatch',
    '请选择 Rainy75 V2 的 USB 正常模式设备':'Select the Rainy75 V2 USB device in normal mode','设备接口不匹配：需要 Report 0、256 字节的配置接口':'Wrong interface: Report 0 with a 256-byte configuration report is required','HID 应答长度不是 256 字节':'HID response is not 256 bytes','设备未连接':'Device not connected','已有操作正在进行':'An operation is already in progress','通信操作重叠':'Overlapping communication operations','命令不在本工具允许范围内':'Command is outside this tool’s allowed set',
    '通信超时，结果待确认；请断开连接后重新读取':'Communication timed out; result is unconfirmed. Disconnect, reconnect and read again.',
    '使用官方兼容的请求缓冲区校验格式':'Using the official-compatible request-buffer checksum format','屏幕返回状态 ':'Screen returned status ',
    '等待屏幕执行结果超时，请断开重连':'Timed out waiting for the screen. Disconnect and reconnect.','（最后状态 ':' (last status ',
    '屏幕仍有未完成操作，请等待后断开重连':'A screen operation is still pending. Wait, then reconnect.','屏幕列表长度无效':'Invalid screen list length','屏幕列表读取失败':'Could not read the screen list','槽位参数错误':'Invalid slot parameter',
    '该槽位内容已变化，已停止删除；请刷新后重新确认':'The slot contents changed. Deletion stopped; refresh and confirm again.','删除后槽位仍有文件':'The slot still contains files after deletion','删除已发送，结果尚未核实；请断开重连后读取，勿重复点击':'Deletion was sent but not verified. Reconnect and read again; do not repeat deletion.','设备已断开':'Device disconnected',
    'BIN 太小或内容为空，不是完整的屏幕应用固件':'BIN is empty or too small to be a complete screen application','BIN 超出当前 Rainy75 V2 屏幕应用区域（最大 496 KiB），不能使用整片备份':'BIN exceeds the Rainy75 V2 screen application region (496 KiB maximum). Full Flash backups are not supported.',
    '初始堆栈地址无效，请选择原始屏幕应用 BIN':'Invalid initial stack address. Select a raw screen application BIN.','复位入口不在 0x08004000 起始的应用镜像内，可能是其他设备固件或整片备份':'Reset entry is outside the application image starting at 0x08004000. This may be firmware for another device or a full backup.','中断向量与当前屏幕应用地址不符':'Interrupt vectors do not match the screen application address',
    '待刷入：':'Ready to flash: ','浏览器不支持 WebHID，请用 Chrome/Edge 89+':'WebHID is unavailable. Use Chrome/Edge 89+.','没有选择设备':'No device selected','警告：选中的接口不是 0xFF60，可能无法下发命令':'Warning: the selected interface is not 0xFF60; commands may fail.','应答超时':'Response timeout','无法向设备发送数据（':'Cannot send data to the device (','未知原因':'Unknown reason','；已试 ':'; attempted ','无应答':'No response','应答过短（':'Response too short (',' 字节）':' bytes)','已取消':'Cancelled','设备返回 ':'Device returned ','失败（地址 ':'Failed (address ',' 附近）：':' nearby): ',
    '擦除中…':'Erasing…','擦除完成':'Erase complete','写入中…':'Writing…','写入完成':'Write complete','校验通过':'Verification passed','结束命令已发送':'End command sent','连接成功':'Connected',
    '请选择设备…（列表里也会显示已在升级模式/boot 的设备）':'Select a device… (BOOT devices are also listed)','选中的是升级模式设备，直接开始烧录':'BOOT device selected; proceeding with flashing','选的设备不是「':'The selected device is not “','请选择设备…':'Select a device…','让设备进入升级模式…':'Switching the device to BOOT mode…','这个设备没响应，请重新选择…':'The device did not respond. Select it again…','已进入升级模式':'Entered BOOT mode','请在弹出的窗口里选择“升级模式”设备…':'Select the BOOT device in the dialog…','选的不是升级模式设备':'The selected device is not in BOOT mode','这次没选中设备（':'Device was not selected (',
    '设备已经在升级模式了，但浏览器还没授权过它 —— 点下面的【选择设备并继续】即可':'The device is in BOOT mode but is not authorized. Click Select device and continue below.',
    '设备已进入升级模式，点【选择设备并继续】在弹窗里选它':'The device is in BOOT mode. Click Select device and continue, then select it in the dialog.',
    '设备已进入升级模式 —— 点【选择设备并继续】在弹窗里选它':'The device is in BOOT mode. Click Select device and continue, then select it in the dialog.',
    '请先断开动画管理的连接，再开始烧录。':'Disconnect animation management before flashing.','这个设备无法识别，请先点上面的卡片选择要烧哪台':'Device not recognized. Select the target device above first.','已选设备：':'Selected device: ','（升级模式）':' (BOOT mode)','选择设备失败：':'Device selection failed: ','==== 开始烧录：':'==== Starting flash: ',' 固件 ':' firmware ','固件已就绪':'Firmware ready','检测到已在升级模式的设备，直接开始烧录':'Authorized BOOT device detected; proceeding with flashing','升级模式设备未连接':'BOOT device is not connected','烧录成功':'Flash successful','选择设备并继续':'Select device and continue','烧录失败：':'Flashing failed: ','（可再点一次“开始烧录”重试）':' (click Start flashing to retry)','**** 失败：':'**** Failed: ','已请求取消…':'Cancellation requested…',
    '已取消离线 BIN 选择':'Offline BIN selection cancelled','已有文件选择正在进行':'A file picker is already active','选择的 BIN 大小与该主题不符，请选择解压目录中的 ':'BIN size does not match this theme. Select this file from the extracted folder: ','选择 ':'Select ',
    '本地主题 · 不公开':'Local theme · Private','本地 BIN':'Local BIN','尚未选择':'Not selected',' · 仅在本次页面会话中使用':' · Used only in this page session','可浏览社区主题，或在「关于」中选择本地文件':'Browse community themes or choose a local file in About','（作者提供）':' (provided by author)','未识别，请以提供者说明为准':'Unknown; refer to the provider’s notes',' · 512 字节对齐':' · Aligned to 512 bytes','尚无文件指纹':'No fingerprint yet',
    '正在烧录，请保持 USB 连接与设备供电':'Flashing. Keep USB connected and the device powered.','点击“选择设备并继续”完成烧录授权':'Click Select device and continue to authorize flashing','当前为 2.4G 连接，开始烧录时会引导选择 USB 键盘':'Connected via 2.4 GHz. Starting a flash will prompt for the USB keyboard.','USB 已连接，开始烧录时自动交接连接':'USB connected; the connection will be handed over for flashing','正在烧录，固件来源已锁定':'Flashing; firmware selection is locked','请先完成本次烧录授权':'Complete flash authorization first','设备正在操作，请稍候再切换固件':'Wait for the device operation before changing firmware','请等待当前设备操作或固件加载完成':'Wait for the current device operation or firmware load to finish',
    '正在检查屏幕 BIN…':'Checking screen BIN…','请选择原始 .bin，不支持 ZIP、HEX 或固件安装程序':'Select a raw .bin file. ZIP, HEX and firmware installers are not supported.','文件超过当前 IPS 屏幕应用区域':'File exceeds the IPS application region','设备状态已变化，请稍后重新选择':'Device state changed. Select again later.',' · 格式检查通过':' · Format check passed','请确认适用设备后点击“使用所选固件”。':'Confirm the target device, then click Use selected firmware.','；当前选择保持不变。':'; the current selection is unchanged.','请先选择并确认屏幕固件':'Select and confirm screen firmware first','固件选择已变化，请重新加载该主题':'Firmware selection changed. Reload the theme.','外部 BIN · ':'External BIN · ','已选用。请前往“固件烧录”，核对文件信息后点击“开始烧录”。':'Selected. Open Flash firmware, verify the file details, then click Start flashing.',
    '下载文件超过屏幕应用区域':'Downloaded file exceeds the screen application region','下载文件过大':'Downloaded file is too large','主题条目不符合当前设备或目录要求':'Theme entry does not match the device or catalog requirements','请选择离线包中的 ':'Select this file from the offline package: ','正在下载并校验主题 BIN…':'Downloading and verifying theme BIN…','主题 BIN 下载失败（':'Theme BIN download failed (','BIN 文件大小与清单不一致':'BIN size does not match the manifest','SHA-256 与清单不一致，已停止加载':'SHA-256 does not match the manifest. Loading stopped.','主题加载已取消':'Theme loading cancelled','设备状态已变化，请重新选择':'Device state changed. Select again.',' · 文件大小及 SHA-256 已核对':' · File size and SHA-256 verified','主题已校验，请确认风险后使用。':'Theme verified. Accept the risks before using it.','已取消主题加载':'Theme loading cancelled','；当前固件保持不变。':'; the current firmware is unchanged.','已清除选择，未对设备写入任何内容。':'Selection cleared. Nothing was written to the device.','此开源版不内置固件，请先选择屏幕 BIN。':'This open-source version includes no firmware. Select a screen BIN first.','请等待当前操作完成':'Wait for the current operation to finish','此工具仅支持 IPS 屏幕固件':'This tool only supports IPS screen firmware','请先选择有效的屏幕 BIN':'Select a valid screen BIN first',
    '需重新连接':'Reconnect required','处理中':'Working','已连接':'Connected','壁纸 ':'Wallpaper ','空槽位 · 切换时自动跳过':'Empty slot · Skipped when switching','等待设备读取':'Waiting to read the device','删除这一页':'Delete this page','将清空壁纸 ':'Delete all files in wallpaper ','，包含以下全部素材：':', including:','正在管理屏幕动画…':'Managing screen animations…','动画管理需要 USB 有线连接，请点击顶部“切换 USB”':'Animations require USB. Click Switch to USB at the top.','正在读取槽位…':'Reading slots…','槽位列表已更新。':'Slot list updated.','正在核对并删除壁纸 ':'Verifying and deleting wallpaper ',' 已清空，删除结果已核实。':' cleared; deletion verified.','USB 已连接，进入本页后将自动读取动画槽位。':'USB connected. Opening this tab automatically reads the animation slots.','当前为 2.4G 连接。动画管理需要 USB，请点击顶部“切换 USB”。':'Connected via 2.4 GHz. Animations require USB; click Switch to USB at the top.','请点击顶部“连接设备”，连接后无需在本页重复连接。':'Click Connect device at the top. No separate connection is needed here.','请使用支持 WebHID 的桌面版 Edge / Chrome 打开此 HTML。':'Open this HTML in desktop Edge / Chrome with WebHID support.',
    '已开启':'On','已关闭':'Off','通信日志':'Communication log','上次通信结果未确认，请断开后重新连接':'The last operation was not confirmed. Disconnect and reconnect.','读取超时（命令 0x':'Read timed out (command 0x','）；请关闭官网驱动页面，唤醒键盘后重试':'). Close the official driver page, wake the keyboard and try again.','不支持的灯光命令':'Unsupported lighting command','板载配置编号无效':'Invalid onboard profile number','结束无线会话失败：':'Failed to end wireless session: ','读取期间板载配置发生变化，请刷新':'Onboard profile changed during the read. Refresh.','正在开启灯光…':'Turning lighting on…','正在关闭灯光…':'Turning lighting off…','板载配置发生变化，请刷新后重试':'Onboard profile changed. Refresh and retry.','设备拒绝灯光切换，状态 ':'Device rejected the lighting change; status ','灯光回读未确认，请断开后重连核对':'Lighting readback was not confirmed. Reconnect to check.','键盘灯光已开启':'Keyboard lighting is on','键盘灯光已关闭':'Keyboard lighting is off','正在读取设备信息…':'Reading device info…','未充电':'Not charging','已充满':'Fully charged','正在充电':'Charging','未知状态（':'Unknown status (','电量已读取，灯光状态读取失败：':'Battery read; lighting status failed: ','设备信息已更新':'Device info updated',
    '粗略理论估算，假设 1kHz、RGB 关闭、平均电流 20–50mA；彩屏和休眠功耗尚未实测。':'Rough theoretical estimate at 1 kHz, RGB off and an assumed average 20–50 mA draw. Screen and sleep power have not been measured.','灯光状态未知，暂不估算':'Lighting unknown; estimate unavailable','RGB 已开启，暂不估算':'RGB on; estimate unavailable','充电中，暂不估算':'Charging; estimate unavailable','无线参考约 ':'Wireless estimate: about ','约 ':'About ',' 小时（粗估）':' hours (rough estimate)','充电状态未知，暂不估算':'Charging status unknown; estimate unavailable','正在读取或更新设备信息…':'Reading or updating device info…','读取失败':'Read failed','连接已切换':'Connection changed','已连接，正在准备读取设备信息。':'Connected. Preparing to read device info.','点击顶部“连接设备”即可，无需在各页面重复连接。':'Click Connect device at the top. All tabs share the connection.',
    '官方目录':'Official catalog','播放预览':'Play preview','请选择解压目录中的 ':'Select this file from the extracted folder: ','正在下载并核对 ':'Downloading and verifying ','文件大小与 SHA-256 已核对。确认后仅选用主题，不会自动烧录。':'File size and SHA-256 verified. Confirming selects the theme; it does not flash automatically.','已取消加载':'Loading cancelled','模拟预览':'Simulated preview','屏幕实拍':'Device capture','作者标注：已实机测试':'Author reports: hardware tested','作者标注：未实机测试':'Author reports: not hardware tested','选择主题':'Select theme','下载 BIN':'Download BIN','暂停预览':'Pause preview',
    '当前是双击打开的 file:// 页面，浏览器限制读取社区目录和 BIN。请通过本地服务打开。':'This file:// page cannot read the catalog or BIN files. Use the offline release or open through a local server.','正在读取主题目录…':'Reading theme catalog…','离线目录格式不支持':'Unsupported offline catalog format','：无法请求，请确认使用 localhost 或 HTTPS，并检查本地服务是否启动':': request failed. Use localhost or HTTPS and check that the local server is running.','目录格式不支持':'Unsupported catalog format','预览保持屏幕 320 × 172 比例；点击“播放预览”查看动画。':'Previews use the screen’s 320 × 172 aspect ratio. Click Play preview to view an animation.','主题目录读取失败，请展开下方“查看原因”；也可以在「关于」加载本地 BIN。':'Could not read the theme catalog. Expand Show details below, or load a local BIN in About.','暂未收录主题，可在「关于」加载本地 BIN。':'No themes listed yet. Load a local BIN in About.',
    '写入':'Write','校验':'Verify',' 字节':' bytes'
  };
  const entries=Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
  const pattern=new RegExp(entries.map(([key])=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  const originals=new WeakMap(),attributes=new WeakMap();
  let preference='auto',language;
  try{const saved=localStorage.getItem('rainy-language');if(['auto','zh','en'].includes(saved))preference=saved;}catch{}
  const resolve=()=>preference==='auto'?((navigator.languages?.[0]||navigator.language||'en').toLowerCase().startsWith('zh')?'zh':'en'):preference;
  function translate(text){
    if(language!=='en')return text;
    // One pass: replacements are never translated again, and variable data stays intact.
    return text.replace(pattern,key=>dictionary[key]);
  }
  function updateText(node){
    if(node.parentElement?.closest('script,style,noscript,[data-no-i18n]'))return;
    const previous=originals.get(node),current=node.nodeValue;
    const source=previous&&current===previous.rendered?previous.source:current;
    const rendered=translate(source);originals.set(node,{source,rendered});if(current!==rendered)node.nodeValue=rendered;
  }
  function updateElement(element){
    if(element.closest('script,style,noscript,[data-no-i18n]'))return;
    let records=attributes.get(element);if(!records){records={};attributes.set(element,records);}
    for(const key of ['aria-label','title','alt','placeholder']){
      const current=element.getAttribute(key);if(current===null)continue;
      const previous=records[key],source=previous&&current===previous.rendered?previous.source:current,rendered=translate(source);
      records[key]={source,rendered};if(current!==rendered)element.setAttribute(key,rendered);
    }
  }
  function walk(node){if(node.nodeType===3){updateText(node);return;}if(node.nodeType!==1)return;updateElement(node);for(const child of node.childNodes)walk(child);}
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    for(const record of records){if(record.type==='attributes')updateElement(record.target);else if(record.type==='characterData')updateText(record.target);else for(const child of record.addedNodes)walk(child);}
    observe();
  });
  function observe(){observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt','placeholder']});}
  function apply(){language=resolve();document.documentElement.lang=language==='zh'?'zh-CN':'en';observer.disconnect();walk(document.documentElement);observe();}
  function initialize(){
    const select=document.getElementById('language');select.value=preference;
    select.onchange=()=>{preference=['auto','zh','en'].includes(select.value)?select.value:'auto';try{localStorage.setItem('rainy-language',preference);}catch{}apply();};apply();
  }
  window.RainyI18n={translate,getLanguage:()=>language};
  window.addEventListener('languagechange',()=>{if(preference==='auto')apply();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
