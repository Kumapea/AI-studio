/* ============================================================
   report-generator.js — 汇报生成（项目进展与设计汇报 PPT）
   ------------------------------------------------------------
   排版参照用户上传的复盘报告：浅米色页头带（标题 + 元数据行 +
   一句话概述）+ 白底分节网格（编号标题 + 正文，重点分节用浅灰
   卡片背景强调）。一页表单对应一张幻灯片，可加多页。
   用 pptxgenjs（+ jszip）在浏览器本地生成 .pptx 并直接下载，
   不经过任何服务器。
   ============================================================ */
(function (global) {
  "use strict";

  var COLOR = {
    band: "F1EFE9", white: "FFFFFF", ink: "262420", sub: "635C50",
    tint: "E9E5DC", accent: "B96A1E"
  };
  var FONT = "Microsoft YaHei";

  function blankSection() { return { heading: "", body: "", emphasis: false }; }
  function blankPage() {
    return {
      title: "", meta: "", summary: "",
      sections: [blankSection(), blankSection(), blankSection(), blankSection()]
    };
  }

  var state = { pages: [blankPage()] };

  function el(id) { return document.getElementById(id); }

  /* ---------------- DOM ⇄ state 同步 ---------------- */

  function syncFromDom() {
    var host = el("rg-pages");
    if (!host) return;
    host.querySelectorAll(".report-page-card").forEach(function (card) {
      var pi = +card.getAttribute("data-page");
      var page = state.pages[pi];
      if (!page) return;
      page.title = card.querySelector(".rg-title").value;
      page.meta = card.querySelector(".rg-meta").value;
      page.summary = card.querySelector(".rg-summary").value;
      card.querySelectorAll(".report-section-row").forEach(function (row) {
        var si = +row.getAttribute("data-section");
        var sec = page.sections[si];
        if (!sec) return;
        sec.heading = row.querySelector(".rg-sec-heading").value;
        sec.body = row.querySelector(".rg-sec-body").value;
        sec.emphasis = row.querySelector(".rg-sec-emph").checked;
      });
    });
  }

  /* ---------------- 渲染表单 ---------------- */

  function render() {
    var host = el("view-report-body");
    if (!host) return;
    host.innerHTML =
      '<div class="panel">' +
        '<h3>页面</h3>' +
        '<p class="hint">一页对应导出 PPT 里的一张幻灯片；页头是标题 + 数据/元信息一行 + 一句话概述，' +
        '下面 2～4 个分节自动排成方格，勾选“重点强调”的分节会带浅灰底色。</p>' +
        '<div id="rg-pages"></div>' +
        '<div class="btn-row"><button class="btn" id="rg-add-page" style="--accent:var(--brick)">+ 添加页面</button></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<div class="field" style="flex:1;max-width:280px;margin:0"><input type="text" id="rg-filename" placeholder="文件名，如：项目周报-0902"></div>' +
        '<button class="btn primary" id="rg-generate" style="background:var(--brick);border-color:var(--brick);color:#fff">▶ 生成并下载 PPT</button>' +
        '<span class="status-line" id="rg-status"></span>' +
      '</div>';

    renderPages();
    el("rg-add-page").addEventListener("click", function () {
      syncFromDom();
      state.pages.push(blankPage());
      renderPages();
    });
    el("rg-generate").addEventListener("click", generate);
  }

  function renderPages() {
    var host = el("rg-pages");
    host.innerHTML = state.pages.map(pageHtml).join("");

    host.querySelectorAll(".report-page-card").forEach(function (card) {
      var pi = +card.getAttribute("data-page");

      var delPageBtn = card.querySelector(".rg-del-page");
      if (delPageBtn) delPageBtn.addEventListener("click", function () {
        syncFromDom();
        state.pages.splice(pi, 1);
        renderPages();
      });

      card.querySelector(".rg-add-section").addEventListener("click", function () {
        syncFromDom();
        state.pages[pi].sections.push(blankSection());
        renderPages();
      });

      card.querySelectorAll(".rg-del-section").forEach(function (btn) {
        btn.addEventListener("click", function () {
          syncFromDom();
          var si = +btn.getAttribute("data-section");
          state.pages[pi].sections.splice(si, 1);
          renderPages();
        });
      });
    });
  }

  function pageHtml(page, pi) {
    return (
      '<div class="report-page-card" data-page="' + pi + '">' +
        '<div class="rp-head"><b>第 ' + (pi + 1) + ' 页</b>' +
          (state.pages.length > 1 ? '<button class="btn small ghost rg-del-page">删除本页</button>' : '') +
        '</div>' +
        '<div class="field"><label>标题</label><input type="text" class="rg-title" value="' + escAttr(page.title) + '" placeholder="例如：AI 视频制片台 · 本周进展"></div>' +
        '<div class="row">' +
          '<div class="field"><label>数据 / 元信息（可选，用 “/” 或 “｜” 分隔）</label><input type="text" class="rg-meta" value="' + escAttr(page.meta) + '" placeholder="周期：8/26–9/2 / 已完成模块：4 / 阻塞项：0"></div>' +
        '</div>' +
        '<div class="field"><label>一句话概述</label><textarea class="rg-summary" rows="2" placeholder="本周完成了提示词引擎与增长诊断两个核心模块，设计上从深色仪表盘转向了更轻的浅色编辑手记风格。">' + escHtml(page.summary) + '</textarea></div>' +
        '<h3 style="margin-top:6px">分节（' + page.sections.length + '）</h3>' +
        page.sections.map(function (s, si) { return sectionHtml(s, si); }).join("") +
        '<div class="btn-row" style="margin-top:0"><button class="btn small rg-add-section">+ 添加分节</button></div>' +
      '</div>'
    );
  }

  function sectionHtml(s, si) {
    return (
      '<div class="report-section-row" data-section="' + si + '">' +
        '<div class="field"><label>' + (si + 1) + '. 分节标题</label><input type="text" class="rg-sec-heading" value="' + escAttr(s.heading) + '" placeholder="如：本周完成"></div>' +
        '<div class="field"><label>正文（换行分段）</label><textarea class="rg-sec-body" rows="3" placeholder="要点内容…">' + escHtml(s.body) + '</textarea></div>' +
        '<div class="field" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding-top:22px">' +
          '<label style="display:flex;align-items:center;gap:5px;margin:0;white-space:nowrap"><input type="checkbox" class="rg-sec-emph"' + (s.emphasis ? " checked" : "") + '> 重点强调</label>' +
          '<button class="btn small ghost rg-del-section" data-section="' + si + '">删除</button>' +
        '</div>' +
      '</div>'
    );
  }

  function escHtml(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }

  /* ---------------- 生成 PPTX ---------------- */

  function buildPptx(pages) {
    var pptx = new PptxGenJS();
    pptx.defineLayout({ name: "REPORT_16X9", width: 13.333, height: 7.5 });
    pptx.layout = "REPORT_16X9";

    pages.forEach(function (page) {
      var slide = pptx.addSlide();
      slide.background = { color: COLOR.white };

      var hasSummary = !!(page.summary && page.summary.trim());
      var bandH = hasSummary ? 1.55 : 1.05;
      slide.addShape("rect", { x: 0, y: 0, w: 13.333, h: bandH, fill: { color: COLOR.band }, line: { type: "none" } });

      var headline = page.title || "未命名页面";
      if (page.meta && page.meta.trim()) headline += "   |   " + page.meta.trim();
      slide.addText(headline, {
        x: 0.5, y: 0.28, w: 12.33, h: 0.45, align: "center", valign: "middle",
        fontSize: 15, bold: true, color: COLOR.ink, fontFace: FONT
      });
      if (hasSummary) {
        slide.addText(page.summary.trim(), {
          x: 1.0, y: 0.78, w: 11.33, h: 0.65, align: "center", valign: "top",
          fontSize: 11, color: COLOR.sub, fontFace: FONT
        });
      }

      var sections = (page.sections || []).filter(function (s) { return (s.heading && s.heading.trim()) || (s.body && s.body.trim()); });
      if (!sections.length) sections = [{ heading: "（未填写分节内容）", body: "", emphasis: false }];

      var cols = 2;
      var rows = Math.ceil(sections.length / cols);
      var gridX = 0.55, gridY = bandH + 0.35, gridW = 13.333 - gridX * 2, gridH = 7.5 - gridY - 0.35;
      var gapX = 0.5, gapY = 0.35;
      var cellW = (gridW - gapX * (cols - 1)) / cols;
      var cellH = (gridH - gapY * (rows - 1)) / rows;

      sections.forEach(function (s, i) {
        var r = Math.floor(i / cols), c = i % cols;
        var x = gridX + c * (cellW + gapX);
        var y = gridY + r * (cellH + gapY);

        if (s.emphasis) {
          slide.addShape("roundRect", {
            x: x - 0.15, y: y - 0.12, w: cellW + 0.3, h: cellH + 0.24,
            rectRadius: 0.08, fill: { color: COLOR.tint }, line: { type: "none" }
          });
        }

        var runs = [];
        if (s.heading && s.heading.trim()) {
          runs.push({ text: (i + 1) + ". " + s.heading.trim() + "\n", options: { bold: true, fontSize: 13, color: COLOR.accent, breakLine: true } });
        }
        if (s.body && s.body.trim()) {
          s.body.trim().split(/\n+/).forEach(function (para, pIdx, arr) {
            runs.push({ text: para + (pIdx < arr.length - 1 ? "\n\n" : ""), options: { fontSize: 11, color: COLOR.ink } });
          });
        }
        slide.addText(runs, {
          x: x, y: y, w: cellW, h: cellH, valign: "top", fontFace: FONT,
          fit: "shrink", lineSpacingMultiple: 1.25
        });
      });
    });

    return pptx;
  }

  async function generate() {
    syncFromDom();
    var statusEl = el("rg-status");
    var pages = state.pages;
    if (!pages.length || !pages.some(function (p) { return p.title.trim(); })) {
      statusEl.textContent = "至少给一页填写标题";
      statusEl.className = "status-line err";
      return;
    }
    statusEl.textContent = "生成中…";
    statusEl.className = "status-line busy";
    el("rg-generate").disabled = true;
    try {
      var pptx = buildPptx(pages);
      var fname = (el("rg-filename").value.trim() || "项目进展与设计汇报") .replace(/\.pptx$/i, "") + ".pptx";
      await pptx.writeFile({ fileName: fname });
      statusEl.textContent = "已生成：" + fname;
      statusEl.className = "status-line ok";
    } catch (e) {
      statusEl.textContent = "生成失败：" + (e && e.message ? e.message : e);
      statusEl.className = "status-line err";
    } finally {
      el("rg-generate").disabled = false;
    }
  }

  global.ReportGenerator = { render: render };
})(window);
