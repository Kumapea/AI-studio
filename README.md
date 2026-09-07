# AI制片台｜Chrome + Android

这一版按两个产品方向拆开：

- **Chrome = 生产工具**：剧本 → AI导演标注 → 构图 / 景别 / 运镜 → 动作深化 → LibTV Prompt。
- **Android = 研究工具**：发现值得研究的视频 → 保存研究对象（原链接 + 公开数据 + 备注）→ 研究库 → 深入拉片 → 本周创作雷达。

## Logo
本仓库使用指定的黑白 AI制片台 Logo，并同步用于 Chrome 扩展图标、Android 启动图标与悬浮按钮。

## Android APK
仓库包含 Android 工程与 GitHub Actions 工作流。当前容器未配置 Android SDK/Gradle，因此没有在本地生成 APK；推到 GitHub 后，Actions 会自动构建 Debug APK 并作为 Artifact 提供下载。

## macOS 上传到 GitHub
### 第一次上传整个仓库
先把这个压缩包解开，在“终端”进入仓库目录：

```bash
cd /你的路径/AI制片台

git init
git branch -M main
git add .
git commit -m "AI制片台 v4：Chrome剧本标注 + Android研究库"
```

然后在 GitHub 新建一个空仓库，不要勾选 README / .gitignore / License，再把远程仓库接上：

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 如果 GitHub 需要登录
推荐 GitHub CLI：

```bash
brew install gh
brew install git

gh auth login
```

选择：
`GitHub.com` → `HTTPS` → `Login with a web browser`

登录完成后：

```bash
gh auth setup-git
git push -u origin main
```

### 以后修改后更新仓库
```bash
git add .
git commit -m "更新：剧本标注 / Android 研究库"
git push
```

### GitHub Actions 构建 APK
代码推送到 GitHub 后，打开仓库的：

`Actions` → `Build Android APK`

点击 `Run workflow`，或者直接 push `android-app/**` 的改动触发构建。完成后进入该次运行页面，在 `Artifacts` 下载 `AI制片台-Android-debug`。

### Chrome 扩展安装
在 Chrome 地址栏打开：

`chrome://extensions/`

开启“开发者模式” → “加载已解压的扩展程序” → 选择仓库里的 `browser-extension/`。

## 产品工作流
Chrome：

`剧本` → `AI导演深化` → `影视执行层` → `LibTV Prompt`

Android：

`刷到好视频` → `主动记录` → `研究库` → `深入拉片` → `AI研究任务` → `本周创作雷达`
