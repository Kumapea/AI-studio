/* ============================================================
   background.js — 常驻 service worker
   唯一职责：让点击工具栏图标直接打开侧边栏（否则默认要右键选
   "打开侧边栏"，多一步）。其余逻辑都在侧边栏自己的脚本里直接
   调用 chrome.tabs / chrome.scripting，侧边栏页面本身就有扩展
   权限，不需要额外经过这个 background 转发。
   ============================================================ */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
