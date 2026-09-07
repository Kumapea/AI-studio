# AI制片台 Chrome 扩展

定位：**用户负责说人话，AI负责懂影视。**

当前核心工作流：

> 剧本 → AI导演标注 → 构图 / 景别 / 运镜 → 动作与表演深化 → LibTV Prompt

扩展不要求用户逐项填写影视参数。你可以先把粗剧本写出来，AI再把一个镜头逐层翻译成可执行的影视语言。

## 安装
1. 打开 Chrome `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本目录 `browser-extension/`

扩展内置 DeepSeek / Kimi / GPT / Gemini 的网页交接逻辑，不需要 API Key。实际模型调用仍由对应网页版完成。

## 核心模块
- `modules/script-tagging/`：剧本标注工作台
- `js/prompt-engine.js`：AI导演任务生成
- `js/handoff.js`：把任务交给免费网页版 AI
- `js/db.js`：本地历史存储

## 注意
网页 AI 的 DOM/UI 可能变化；若某个站点交接失效，可直接复制任务文本手动粘贴。
