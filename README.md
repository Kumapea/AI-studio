# AI制片台

AI制片台 V3：AI导演 + 视频分析 + 爆款拆解 + 我的传播诊断。

## 平台

- `browser-extension/`：Chrome MV3 扩展
- `android-app/`：Android App，包含悬浮 AI 按钮与分享入口
- `.github/workflows/`：GitHub Actions 自动构建 Chrome 扩展和 Android APK

## GitHub Actions

1. **Build Chrome Extension** → Chrome ZIP
2. **Build Android APK** → `app-debug.apk`

Android debug APK 可以直接安装到 Android 手机（首次可能需要允许安装未知来源应用）。

## AI 网页交接

核心功能默认不要求 API Key，任务交给 DeepSeek / Kimi / GPT / Gemini 网页端完成。Chrome 扩展已配置对应站点的自动填入入口。
