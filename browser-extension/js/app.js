/* ============================================================
   app.js — 侧边栏路由：底部标签切换 + 各模块懒初始化
   ============================================================ */
(function () {
  "use strict";

  var VIEWS = ["prompt", "video", "growth", "report", "script"];
  var TITLES = { prompt: "提示词精修", video: "视频分析", growth: "增长诊断", report: "汇报生成", script: "剧本标注" };
  var rendered = {};

  function activate(name) {
    VIEWS.forEach(function (v) {
      document.getElementById("view-" + v).classList.toggle("active", v === name);
      var nav = document.querySelector('.nav-item[data-view="' + v + '"]');
      if (nav) nav.classList.toggle("active", v === name);
    });
    var t = document.getElementById("topbar-title");
    if (t) t.textContent = TITLES[name] || "视频制片台";

    if (!rendered[name]) {
      rendered[name] = true;
      if (name === "prompt") PromptEngine.render();
      else if (name === "video") VideoAnalyzer.render();
      else if (name === "growth") GrowthCopilot.render();
      else if (name === "report") ReportGenerator.render();
      // script 是 iframe，独立初始化
    }
    try { localStorage.setItem("studio:lastView", name); } catch (e) {}
  }

  document.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () { activate(btn.getAttribute("data-view")); });
  });

  var last = "prompt";
  try { last = localStorage.getItem("studio:lastView") || "prompt"; } catch (e) {}
  if (VIEWS.indexOf(last) === -1) last = "prompt";
  activate(last);
})();
