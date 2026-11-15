# 社区屏幕固件 Marketplace

社区固件清单初始为空。网页「固件烧录 → 社区主题」和「关于 → 浏览主题」共用浏览面板；支持静态封面、GIF 预览、下载和校验后选用。选用需要风险确认，不会自动刷写。

## 提交结构

每个项目放在 `marketplace/<id>/`，推荐包含：

- `README.md`：效果、适用型号、操作、恢复方式及已知问题。
- `firmware.bin`：可公开分发、适用于 Rainy75 V2 IPS 的原始应用镜像。
- `LICENSE`：该固件自己的许可说明。
- `cover.png`：必填的静态封面，严格为 **320 × 172**。
- `preview.gif`：可选的动画预览，画布同样严格为 **320 × 172**。
- 不提交脚本或网页。

在 `marketplace/catalog.json` 的 `entries` 中加入条目。字段规范见 [manifest.schema.json](manifest.schema.json)，示例见 [manifest.example.json](manifest.example.json)。示例不是实际可下载固件，也不会自动加入清单。

## 必要信息

- 稳定且唯一的 `id`、名称、版本与作者。
- 固定目标 `rainy75v2-ips` 和应用地址 `0x08004000`。
- 相对本仓库的 `file` 路径、原文件字节数、SHA-256。
- 固件的许可、来源 URL、允许再分发的确认。
- `hardwareTested` 如实记录；未测试不能写成已验证。
- `preview` 记录 `width: 320`、`height: 172`、`cover` 路径和可选 `animation` 路径。
- `preview.type` 为 `simulation`（模拟渲染）或 `device-capture`（屏幕实拍），不要把模拟图标成实拍。

预览图片与屏幕比例一致（80:43）。前端完整显示，不拉伸、不裁切；GIF 默认不自动播放，点击“播放预览”才加载，关闭面板后恢复封面。PNG 最大 2 MiB，GIF 最大 10 MiB；构建会检查实际图片头中的尺寸。

所有 BIN 和预览路径需留在对应目录中，不能使用远程资源地址、父路径、符号链接或替换网页脚本。构建会读取并核对清单列出的文件；未列入清单的 BIN 或图片不会进入 Pages 输出。前端选用时再次核对下载长度、SHA-256 和镜像结构。

## 私有本地样例

`firmware/bongocat/catalog.json` 和 `firmware/local/catalog.json` 可声明 `private: true`、`redistributionAllowed: false` 的本地条目。它们只能由 localhost 浏览器加载，不写入公开的 `marketplace/catalog.json`。

`npm run dev` 自动合并存在的本地目录。普通 `npm run build` 永远排除它们；`npm run build:local` 显式生成本地测试产物，再用 `npm run preview` 浏览。CI 拒绝本地构建标志。不要把本地测试 `dist` 手工上传到网站。

运行 `npm run catalog:check` 后提交 Pull Request。维护者审查通过后再合并。官网固件或基于官方固件修改的作品，应先确认其分发条件；仓库的 MIT 许可不会自动覆盖这些 BIN。
