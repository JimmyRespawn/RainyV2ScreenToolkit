# GitHub Pages 部署

1. 将 `RainyMurphy` 文件夹的内容作为一个独立 GitHub 仓库根目录提交。
2. 打开仓库 Settings → Pages → Build and deployment，将 Source 设为 GitHub Actions。
3. 默认分支使用 `main`；推送后，`.github/workflows/pages.yml` 会检查、测试、构建并部署 `dist`。
4. 使用 Actions 部署作业给出的 HTTPS 地址访问。

给普通用户分发这个 HTTPS 地址即可。用户无需下载项目、安装 Node.js 或运行启动脚本；这些工具只供维护者开发和构建。在线网页选择本地 BIN 时使用浏览器 File API，文件不会上传到 GitHub 或其他服务器。

不需要配置令牌到源码，也不需要在网站里放 BIN 才能使用电量、灯光或动画管理。首次使用固件烧录时，用户自行选择本地 BIN。

项目路径全部使用相对 URL，适用于 GitHub Pages 的仓库子路径。只发布 `dist`，不会把测试、个人原始工作目录、文档编辑脚本或未列入目录的固件一同上传到网站。

如使用其他静态托管服务，运行 `npm run build` 后上传 `dist` 的内容即可。需要 HTTPS；本地开发使用 `http://127.0.0.1:4173`。

官方参考：

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

此目录只准备部署文件，不会自动创建仓库、推送代码或启用公开访问。
