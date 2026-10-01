# VPS 网页部署

地址：`https://66.154.101.204/RehabMind/`。根地址也跳转至此入口。

使用服务器已有的 Nginx、Node 22 和 systemd。网页静态文件由 Nginx 提供，API 只监听 `127.0.0.1:8787`，通过 `/RehabMind/api/` 访问。无额外数据库服务、容器、PM2 或公网端口。

## 文件布局

```text
/opt/rehabmind-v2/
  web/                   网页与模型构建产物
  api/                   Node API 源码
  knowledge/runtime.json 数据库生成的运行快照
```

服务配置使用 `deploy/rehabmind-v2.service`，安装到 `/etc/systemd/system/rehabmind-v2.service`。Nginx 的 HTTPS server 内引用 `/etc/nginx/snippets/rehabmind-v2.conf`，内容来自 `deploy/nginx-rehabmind.conf`。HTTP 入口跳转至 HTTPS。既有 `/clinic/`、`/shop/` 服务独立保留。

## 构建（本地 PowerShell）

```powershell
$env:VITE_BASE_PATH = '/RehabMind/'
$env:VITE_API_BASE_URL = '/RehabMind'
npm run build
Remove-Item Env:VITE_BASE_PATH, Env:VITE_API_BASE_URL
```

将 `build/web`、`api`、`build/knowledge/runtime.json` 分别上传至上述对应目录。服务器不需要安装 npm 或 Python 构建依赖。样式参考页不随正式网页发布。

## 更新后

```sh
sudo systemctl restart rehabmind-v2
curl --fail https://66.154.101.204/RehabMind/api/health
```

API 日志：`sudo journalctl -u rehabmind-v2 -n 50 --no-pager`。
修改 Nginx 配置时执行 `sudo nginx -t && sudo systemctl reload nginx`。

VPS部署不迁移术后网站内容，不设自动发布或额外备份流程。安卓测试包通过独立的GitHub工作流构建，见 `ANDROID_BUILD.md`。
