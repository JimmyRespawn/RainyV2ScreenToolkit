# 贡献

代码修改请通过 Pull Request 提交，并运行：

```sh
npm test
npm run check
npm run build
```

不要提交本地采集日志、用户设备信息、旧工作目录或未经确认可公开分发的二进制。协议修改需说明原始行为、报文结构和验证方式；涉及实际刷写时，说明硬件型号、固件和是否实机测试。

社区固件按 [marketplace/README.md](marketplace/README.md) 提交。厂商原版固件单独归入 `firmware/official`；社区修改版不可标记成官方发布。

网站目录只是展示与下载，任何新条目都不会让网页自动执行、加载或刷写 BIN。不要在目录中加入可执行 JavaScript、HTML、追踪脚本或自动烧录逻辑。
