# RainyMurphy

[English](README.md) | **简体中文**

Made by **JimmyRespawn**。

Rainy75 V2 IPS 彩屏的浏览器工具：屏幕固件烧录、动画槽位管理、设备信息与 RGB 开关。

**网页工具与固件完全分离。仓库不附带、编码或隐藏任何 BIN。** 用户在「固件烧录」中选择目标和固件，文件只在当前页面内存中使用，不会上传，刷新后清空。

## 功能

- 顶部统一连接；已授权的单台设备可直接重连。
- 中文与英文界面，默认跟随浏览器首选语言，可手动切换并保存选择。
- 浅色、暗色与跟随系统外观。
- USB 支持全部功能；2.4GHz 接收器支持电量读取与 RGB 控制。
- 动画管理进入页面后按需读取，删除前确认并回读验证。
- 屏幕 BIN 大小、应用地址和向量结构检查；支持 SHA-256 核对。
- 烧录前自动交接连接，成功后尝试重新连接普通 USB 接口。
- 续航显示为假设电流下的粗估，RGB 开启时暂停，不代表实测结果。

**支持显式选择 IPS 屏幕或 2.4G 接收器。没有键盘主控或整片 Flash 刷写入口。** 格式检查不能证明固件兼容，刷写外部固件前需要确认适用型号及风险。

## 普通用户如何使用

部署到 GitHub Pages 后，将 HTTPS 站点地址发给用户即可。用户打开网页就能连接设备、浏览已公开主题和选择本地 BIN，**不需要安装 Node.js、运行脚本或启动本地服务**。选择的本地 BIN 不会上传。

Node.js、下面的启动命令及 `Start-RainyMurphy.cmd` 仅供维护者本地开发、私有主题测试和构建使用，启动脚本不在网站发布产物内。

## 维护者本地运行

安装 Node.js 20 或更高版本，无第三方 npm 依赖。

```sh
npm run dev
```

用桌面版 Chrome / Edge 打开 `http://127.0.0.1:4173`。HTTPS 网站或 localhost 为推荐运行方式。首次连接和设备进入升级模式时，浏览器可能需要用户主动授权。

Windows 下也可双击项目根目录的 `Start-RainyMurphy.cmd`，自动启动本地服务并打开浏览器。直接双击源码中的 `src/index.html` 不能读取主题目录。维护者开发请使用本地服务；用户可使用下方离线压缩包中的独立 HTML，无需服务。

```sh
npm test
npm run check
npm run build
```

构建输出在 `dist/`，可部署到 GitHub Pages 或其他静态站点。网页使用相对路径，适用于 `username.github.io/RainyMurphy/` 一类项目地址。

## 项目目录

| 目录 | 用途 |
| --- | --- |
| `src/` | HTML、CSS、原生 JavaScript 与自绘 SVG |
| `src/js/device/` | 共用连接与屏幕协议 |
| `src/js/firmware/` | BIN 校验、固件选择、IPS 烧录传输 |
| `src/js/ui/` | 标签页、基础信息与动画管理 |
| `doc/` | 使用、开发、部署与协议说明 |
| `firmware/official/` | 官方固件目录清单，初始为空 |
| `marketplace/` | 社区固件清单、格式规范与提交模板 |
| `scripts/` | 本地服务、检查和构建脚本 |
| `test/` | 无硬件离线检查 |

## 固件与社区

公开的官方目录和社区目录目前均为空。允许通过 Pull Request 提交固件目录项；格式、路径、文件大小、SHA-256、镜像结构和 320 × 172 预览尺寸会在构建时检查。烧录页的「浏览主题」提供封面和 GIF。确认主题文件后，按页面提示连接设备并点击「开始更新」。

### 本地私有主题

`npm run dev` 会合并本机 `firmware/bongocat/`、`firmware/local/` 中存在的私有目录清单。它们可在 localhost 或显式生成的本地离线包中显示，不会进入普通构建、公开离线包或 GitHub Pages。

```sh
npm run build:local
npm run preview
```

以上两条用于显式构建、预览私有样例。`dist/` 与本地固件目录受 Git 忽略；不要手工发布本地测试产物。正常公开部署始终运行 `npm run build`。

- [使用说明](doc/usage.md)
- [GitHub Pages 部署](doc/deployment.md)
- [架构与开发](doc/development.md)
- [协议与限制](doc/protocol.md)
- [官方固件目录](firmware/official/README.md)
- [社区固件提交规范](marketplace/README.md)
- [贡献说明](CONTRIBUTING.md)

## 许可与状态

网页代码采用 [MIT](LICENSE) 许可。固件独立保留其各自的授权条件，代码许可不覆盖厂商固件。项目不附带官方驱动脚本、厂商字体或官网键盘渲染图。页面使用自绘键盘布局示意图。

这是社区工具，不代表 WOB 官方。离线模拟不能替代实机测试；维护者需要记录所支持的硬件和实际测试结果。
## 离线压缩包分发

维护者运行 `npm run pack:offline`，生成 `release/RainyMurphy-offline.zip`。用户完整解压后，用桌面 Chrome / Edge 打开 `RainyMurphy.html`，无需安装 Node 或启动服务。

主题目录、PNG 和 GIF 预览包含在 HTML 中，BIN 仍为独立文件。选用主题时，受浏览器本地文件权限限制，用户需手动选择包内对应 BIN；网页验证大小、SHA-256 和应用向量后，再由用户确认并开始烧录。外部 BIN 也在固件烧录页选择。

本地样例测试使用 `npm run pack:offline:local`，输出 `release/RainyMurphy-offline-local.zip`；它会包含被忽略的私有主题，不用于公开发行。`release/` 已加入 Git 忽略；公开打包默认排除私有主题，CI 禁止包含本地主题。主题清单修改后需要重新打包。


## 接收器刷写

在固件烧录页选择“2.4G 接收器”，加载适用于该接收器的原始 BIN，按提示确认文件。SHA-256 可在「固件详情」查看。屏幕和接收器分别保存文件选择，社区主题只适用于屏幕。文件不会上传，不附带接收器固件。

接收器沿用原工具的升级指令、擦除、写入及校验顺序：正常 PID `0x3071`、BOOT PID `0x3070`、写入偏移 `0x2000`。它是 RISC-V 镜像，使用独立的启动入口和 RAM 向量布局检查，不套用屏幕的 ARM 校验。当前保守限制为 **56 KiB**，这是本工具支持范围，不代表芯片物理容量；其他布局会拒绝。版本不从文件名推断，也不固定为 0x26 或 0x27。

接收器刷写后共享连接保持断开，可手动重新连接读取信息。本次集成通过了模拟测试和文件结构核对，尚未在此进行实机刷写验证。
