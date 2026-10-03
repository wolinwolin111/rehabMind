# 安卓手机测试包

GitHub Actions → Build Android APK → Run workflow，选择 main。

工作流构建完成后，GitHub Releases 会提供 `rehabmind-v2.apk`，可直接下载到手机安装；Actions 同时保存30天的构建产物。使用 Android 7.0 及以上设备。首次安装需允许下载 APK 的应用安装其他应用。

界面与人体模型打包在 APK 内；API 地址为 `https://66.154.101.204/RehabMind`。运行时需要网络，数据库来自服务器。APK 内的界面改动需要重新打包，数据库修改在服务器重启 API 后生效。

Node22、Python3.12、Java21、Android SDK36由工作流准备，不需要在 VPS 安装安卓构建工具。工作流通过 npm构建网页、Capacitor同步、Gradle assembleDebug生成测试签名的APK，并检查APK签名。工作流先恢复或生成 `$HOME/.android/debug.keystore`，再通过 Gradle 的 `appDebugKeystorePath` 明确使用这个文件，构建结束后由 GitHub 缓存保存，便于后续覆盖安装。缓存仍不是永久保存的正式发布密钥；如缓存被清理导致签名改变，需卸载旧测试包再安装。

2026-10-04：核查发现旧工作流缓存指定的文件不存在，Actions 日志出现 Path Validation Error，实际没有保存签名密钥；旧 APK 的签名不一致。此次修正路径并显式指定签名文件。旧密钥无法从 APK 的公钥证书恢复，旧测试版升级到修正后的首个版本需要卸载旧版后安装。

这是供手机验证的测试包，未配置应用商店发布和正式签名。构建成功及签名检查不代表真机功能测试完成。
