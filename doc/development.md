# 架构与开发

项目为原生静态网页，无运行时框架、第三方 npm 依赖或服务端。

`src/index.html` 定义四个面板及所有控件，样式集中在 `src/css/app.css`。经典 `defer` 脚本按 HTML 中声明的依赖顺序运行；不需要将 HTML 再嵌进 JavaScript 或修改某个旧大 HTML 才能构建。

| 模块 | 职责 |
| --- | --- |
| `firmware/flasher.js` | 唯一 IPS 目标、升级接口及写入/校验流程；不包含固件数据 |
| `device/screen-client.js` | 槽位 INFO、LIST、DELETE 和 ACK 协议 |
| `device/connection.js` | 唯一普通设备连接、互斥操作、烧录交接、成功后重连 |
| `ui/tabs.js` | 四个静态标签页及键盘导航 |
| `ui/animation-manager.js` | 槽位界面、删除确认与日志 |
| `ui/basic-info.js` | 电量、灯光状态与粗略续航 |
| `firmware/bin-validator.js` | 本地镜像结构与范围检查，不访问 HID |
| `firmware/source.js` | 本地文件选择、确认、SHA-256 和只读写入快照 |
| `ui/theme-browser.js` | 主题浏览弹窗、320×172 封面与 GIF、经校验和确认后选用 |

普通设备操作必须通过 `RainyConnection.run()`。不能在 UI 模块中重新打开或关闭共享 HIDDevice。烧录前先释放普通接口，交由升级流程管理；只有已授权接口可以自动重连。

固件数组仅保存在当前页面闭包内。传给烧录器的是副本，不写入 LocalStorage、IndexedDB、HTML 或仓库。修改固件文件读取功能时，保留“选择/确认/开始烧录”三个独立步骤。

## 开发命令

`npm run dev` 启动 localhost。`npm test` 运行带模拟 HID 的行为检查，`npm run check` 检查脚本、静态资源和目录清单，`npm run build` 生成可部署的 `dist`。

普通构建只收集 `src` 和公开目录清单明确引用的固件及预览文件，不会扫描或打包仓库旁边的旧固件、个人路径及测试 ZIP。没有公开目录项时，输出中没有 BIN。

本地开发服务将忽略目录中的本地条目合并到返回的社区清单，不修改公开 JSON。只有显式 `--include-local` 构建会复制本地样例，且该标志在 CI 中会被拒绝。前端也只在 localhost 接受 `private` 条目。
