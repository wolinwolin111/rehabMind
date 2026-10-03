# VPS 网页部署

地址：`https://66.154.101.204/RehabMind/`。根地址也跳转至此入口。

仓库：`https://github.com/wolinwolin111/rehabMind`，分支 `main`。正式流程为：本地提交并推送 → VPS 拉取源码 → VPS 构建 → 覆盖服务目录并重启 API。

使用服务器已有的 Nginx、Node 22 和 systemd。网页静态文件由 Nginx 提供，API 只监听 `127.0.0.1:8787`，通过 `/RehabMind/api/` 访问。无额外数据库服务、容器、PM2 或公网端口。

## 文件布局

```text
/opt/rehabmind-v2/
  source/                Git 源码检出（origin/main）
  web/                   网页与模型构建产物
  api/                   Node API 源码
  knowledge/runtime.json 数据库生成的运行快照
```

服务配置使用 `deploy/rehabmind-v2.service`，安装到 `/etc/systemd/system/rehabmind-v2.service`。Nginx 的 HTTPS server 内引用 `/etc/nginx/snippets/rehabmind-v2.conf`，内容来自 `deploy/nginx-rehabmind.conf`。HTTP 入口跳转至 HTTPS。既有 `/clinic/`、`/shop/` 服务独立保留。

## 更新（本地 PowerShell）

```powershell
git push origin main
ssh -o ProxyCommand=none rehab "bash /opt/rehabmind-v2/source/deploy/update-vps.sh"
```

脚本执行 `git pull --ff-only`、`npm ci`、`npm run build`，生成数据、模型和网页。构建成功后用 rsync 覆盖 web/API 并复制运行快照，再重启服务。构建或拉取失败时停止，不覆盖当前服务目录。服务器需 Node.js 22、npm、Python 3、openpyxl 和 rsync（已具备）。

`public/3d`、`build/`、`node_modules/` 在 VPS 生成，不入 Git。正式网页不发布样式参考页。第一次创建源码检出时执行：

```sh
git clone --branch main --single-branch https://github.com/wolinwolin111/rehabMind.git /opt/rehabmind-v2/source
bash /opt/rehabmind-v2/source/deploy/update-vps.sh
```

## 更新后

```sh
sudo systemctl restart rehabmind-v2
curl --fail https://66.154.101.204/RehabMind/api/health
```

API 日志：`sudo journalctl -u rehabmind-v2 -n 50 --no-pager`。
修改 Nginx 配置时执行 `sudo nginx -t && sudo systemctl reload nginx`。

沿用现有 Nginx、systemd 服务，不另设发布或备份服务。安卓测试包通过独立的 GitHub 工作流构建，见 `ANDROID_BUILD.md`。

## 2026-10-03 更新

先直接上传了当日构建，随后按用户要求改为上述 Git 更新流程，由 VPS 从 GitHub 源码重新生成并部署。保留现有 Nginx 配置，未建立备份或新发布服务。

模型请求附加内容版本：Vite 自动对六个模型资源生成哈希，将版本参数写入页面代码，避免新版部件索引与手机缓存的旧模型混用。版本由资源内容决定，无需手动填写发布版本。

验证：公网首页引用最新脚本；JS、CSS、模型 metadata、骨骼和肌肉资源均 HTTP 200；API 健康检查正常；公网查询 `LOC-LL-POSTMEDIAL` 返回小腿后内侧、5 个评估维度和 11 条问诊指导。

手机浏览器刷新服务器网址即可使用新版。APK 内的界面和模型需重新打包安装；此次只更新 VPS 网页和 API，没有生成新 APK。
