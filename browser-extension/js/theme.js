/* ============================================================
   theme.js — 浅色 / 深色主题切换
   ------------------------------------------------------------
   主题状态用 localStorage 同步存取（而不是走 DB.js 的 IndexedDB
   异步接口），因为需要在页面渲染前同步写入 <html data-theme>，
   避免刷新时先闪一下默认主题再跳变到用户偏好。
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "studio:theme";

  var ICON_SUN = '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' +
    '<circle cx="11" cy="11" r="4"/><line x1="11" y1="1.5" x2="11" y2="4"/><line x1="11" y1="18" x2="11" y2="20.5"/>' +
    '<line x1="1.5" y1="11" x2="4" y2="11"/><line x1="18" y1="11" x2="20.5" y2="11"/>' +
    '<line x1="4.4" y1="4.4" x2="6.1" y2="6.1"/><line x1="15.9" y1="15.9" x2="17.6" y2="17.6"/>' +
    '<line x1="4.4" y1="17.6" x2="6.1" y2="15.9"/><line x1="15.9" y1="6.1" x2="17.6" y2="4.4"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 22 22" fill="currentColor"><path d="M18 13.5A8 8 0 1 1 8.5 4a6.5 6.5 0 0 0 9.5 9.5Z"/></svg>';

  function current() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#181715" : "#fbfaf7");
    // 按钮图标显示"点击后会切到哪个模式"
    var icon = theme === "dark" ? ICON_SUN : ICON_MOON;
    document.querySelectorAll(".theme-toggle").forEach(function (b) { b.innerHTML = icon; });
  }

  function toggle() {
    apply(current() === "dark" ? "light" : "dark");
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(current()); // 同步初始化脚本已设置好 data-theme，这里只负责刷新按钮图标 + 状态栏色
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.addEventListener("click", toggle);
    });
  });

  global.Theme = { toggle: toggle, apply: apply, current: current };
})(window);
