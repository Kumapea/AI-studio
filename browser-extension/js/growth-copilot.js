/* ============================================================
   growth-copilot.js — 增长诊断（核心功能 4）
   ------------------------------------------------------------
   算法忠实移植自参考实现 douyin_growth_copilot_v1（popup.js），
   评分/瓶颈判定阈值与文案保持一致。因为独立应用无法像浏览器插件
   那样读取当前活动标签页 DOM，「读取当前页面」改为「粘贴页面文本
   自动解析」：用户从作品页复制可见文字粘贴进来，本地正则解析出
   播放/点赞/评论数——不经过网络，不依赖登录态。
   （顺带修正了原实现中 万/千/百 单位在解析时被丢弃导致数值缩小
   一万倍的问题。）
   ============================================================ */
(function (global) {
  "use strict";

  var LAST_KEY = "growth-last";

  function el(id) { return document.getElementById(id); }
  function numVal(id) {
    var x = Number(el(id).value);
    return isFinite(x) && x > 0 ? x : null;
  }
  function fmt(x) {
    if (x == null) return "—";
    if (x >= 10000) return (x / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    return Math.round(x).toLocaleString();
  }
  function pct(x, d) { return x == null ? null : (x * 100).toFixed(d == null ? 2 : d) + "%"; }

  function parseCount(text, keyword) {
    var re = new RegExp("(\\d[\\d,.]*)\\s*([万千百]?)\\s*" + keyword);
    var m = text.match(re);
    if (!m) return null;
    var num = Number(m[1].replace(/,/g, ""));
    if (m[2] === "万") num *= 10000;
    else if (m[2] === "千") num *= 1000;
    else if (m[2] === "百") num *= 100;
    return isFinite(num) ? Math.round(num) : null;
  }

  /* ---------------- 诊断算法（移植自参考实现，阈值与文案保持一致） ---------------- */

  function diagnose(d) {
    var likeRate = d.views && d.likes ? d.likes / d.views : null;
    var commentRate = d.views && d.comments ? d.comments / d.views : null;
    var targetLikeRate = d.targetViews && d.targetLikes ? d.targetLikes / d.targetViews : null;
    var targetCommentRate = d.targetViews && d.targetComments ? d.targetComments / d.targetViews : null;
    var score = 55, bottlenecks = [], wins = [];

    if (d.completion != null) {
      if (d.completion >= 45) { score += 15; wins.push("完播基础不错，重点转向互动与点击/推荐效率"); }
      else { score -= 18; bottlenecks.push("完播率偏低：优先重做前3秒、节奏和结尾"); }
    } else bottlenecks.push("缺少完播率：这是判断播放瓶颈最重要的数据之一");

    if (likeRate != null) {
      if (likeRate >= 0.05) { score += 10; wins.push("点赞率达到 5%+，内容本身有一定认可度"); }
      else { score -= 8; bottlenecks.push("点赞转化偏低：价值/情绪回报不够明确"); }
    }
    if (commentRate != null && commentRate < 0.005) bottlenecks.push("评论转化偏低：缺少明确立场或可回答的问题"), (score -= 6);
    if (d.targetViews && d.views && d.views < d.targetViews) {
      bottlenecks.push("播放还差 " + fmt(d.targetViews - d.views) + "，不要只追求加量，先提高单位曝光产出");
    }
    score = Math.max(0, Math.min(100, score));

    var opening = [
      "0–3秒直接给冲突、结果或反常识，不先解释背景。",
      "第一句话要让目标观众产生一个明确问题：'为什么？''后来呢？''这和我有什么关系？'。",
      "画面第一帧同时承担信息，不让观众先等字幕或环境镜头。"
    ];
    var retention = [
      (d.duration ? "当前时长 " + d.duration + " 秒：每 5–8 秒安排一次信息变化，避免连续同质画面。" : "每 5–8 秒安排一次信息变化，避免连续同质画面。"),
      "把最有价值的情节/信息提前一档，不要把所有价值都压到最后反转。",
      "结尾完成情绪闭环，但保留一个值得评论的问题。"
    ];
    var interaction = [
      "你站哪一边？只能选 A / B。",
      "如果是你，你会做同样的选择吗？为什么？",
      "你第一遍看到这里的时候，猜到结局了吗？",
      "评论区说一个你最意外的细节，我想看看大家看到的是不是同一个点。"
    ];
    var ab = [
      "A：结果先行——\u201c" + (d.caption ? d.caption.slice(0, 22) : "如果你也遇到过这件事") + "……\u201d",
      "B：冲突先行——\u201c所有人都以为他会这样做，但真正让他改变的，是另一件事。\u201d",
      "C：问题先行——\u201c如果你是他，你会在这一刻做什么？\u201d"
    ];
    var target = [
      targetLikeRate != null ? "目标点赞率：" + pct(targetLikeRate, 2) : "补充目标播放和点赞后可计算目标点赞率",
      targetCommentRate != null ? "目标评论率：" + pct(targetCommentRate, 3) : "补充目标播放和评论后可计算目标评论率",
      d.targetCompletion != null ? "目标完播率：" + d.targetCompletion + "%" : "补充目标完播率"
    ];

    return { score: score, bottlenecks: bottlenecks, wins: wins, likeRate: likeRate, commentRate: commentRate,
      opening: opening, retention: retention, interaction: interaction, ab: ab, target: target };
  }

  /* ---------------- UI ---------------- */

  function render() {
    var host = el("view-growth-body");
    if (!host) return;
    host.innerHTML =
      '<div class="panel" style="--accent:var(--moss)">' +
        '<h3><span class="step-no">①</span>作品</h3>' +
        '<div class="field"><label>作品链接</label><input type="text" id="gc-url" placeholder="粘贴抖音作品链接"></div>' +
        '<div class="field">' +
          '<label>从页面文本自动解析（可选）</label>' +
          '<textarea id="gc-pagetext" placeholder="从作品页全选复制可见文字，粘贴到这里，点“解析”自动填入下方播放/点赞/评论" rows="3"></textarea>' +
          '<div class="btn-row" style="margin-top:8px"><button class="btn small" id="gc-parse" style="--accent:var(--moss)">解析</button>' +
          '<span class="status-line" id="gc-parse-status"></span></div>' +
        '</div>' +
        '<div class="field"><label>标题 / 文案（可选）</label><textarea id="gc-caption" placeholder="粘贴作品标题、简介或口播文案" rows="2"></textarea></div>' +
      '</div>' +

      '<div class="panel" style="--accent:var(--moss)">' +
        '<h3><span class="step-no">②</span>目标</h3>' +
        '<div class="grid-4">' +
          field("目标播放", "gc-targetViews", "10万") + field("目标点赞", "gc-targetLikes", "5000") +
          field("目标评论", "gc-targetComments", "300") + field("目标完播率 %", "gc-targetCompletion", "45") +
        '</div>' +
        '<h3 style="margin-top:16px">当前数据（知道多少填多少）</h3>' +
        '<div class="grid-4">' +
          field("播放", "gc-views") + field("点赞", "gc-likes") + field("评论", "gc-comments") + field("完播率 %", "gc-completion") +
        '</div>' +
      '</div>' +

      '<div class="panel" style="--accent:var(--moss)">' +
        '<h3><span class="step-no">③</span>内容参数</h3>' +
        '<div class="grid-3">' +
          field("视频时长（秒）", "gc-duration", "232") +
          '<div class="field"><label>核心人群</label><input type="text" id="gc-audience" value="20–40岁"></div>' +
          '<div class="field"><label>内容类型</label><select id="gc-type">' +
            ["故事 / 人文", "知识 / 科普", "情绪 / 共鸣", "剧情 / 反转", "生活 / Vlog", "其他"].map(function (o) { return "<option>" + o + "</option>"; }).join("") +
          '</select></div>' +
        '</div>' +
      '</div>' +

      '<div class="btn-row" style="margin:0 0 16px">' +
        '<button class="btn primary" id="gc-run" style="background:var(--moss);border-color:var(--moss);color:#141a10">▶ 开始增长诊断</button>' +
        '<span class="status-line" id="gc-status"></span>' +
      '</div>' +
      '<div id="gc-output"></div>';

    el("gc-parse").addEventListener("click", function () {
      var t = el("gc-pagetext").value;
      var st = el("gc-parse-status");
      if (!t.trim()) { st.textContent = "请先粘贴页面文本"; st.className = "status-line err"; return; }
      var v = parseCount(t, "播放"), l = parseCount(t, "点赞"), c = parseCount(t, "评论");
      if (v != null) el("gc-views").value = v;
      if (l != null) el("gc-likes").value = l;
      if (c != null) el("gc-comments").value = c;
      var found = [v != null && "播放", l != null && "点赞", c != null && "评论"].filter(Boolean);
      if (found.length) { st.textContent = "已解析：" + found.join("、"); st.className = "status-line ok"; }
      else { st.textContent = "未能从文本中识别出播放/点赞/评论，可手动填入"; st.className = "status-line err"; }
    });

    el("gc-run").addEventListener("click", run);
    restoreLast();
  }

  function field(label, id, placeholder) {
    return '<div class="field"><label>' + label + '</label><input type="number" id="' + id + '"' +
      (placeholder ? ' placeholder="' + placeholder + '"' : '') + '></div>';
  }

  function collect() {
    return {
      url: el("gc-url").value.trim(), caption: el("gc-caption").value.trim(),
      views: numVal("gc-views"), likes: numVal("gc-likes"), comments: numVal("gc-comments"), completion: numVal("gc-completion"),
      targetViews: numVal("gc-targetViews"), targetLikes: numVal("gc-targetLikes"),
      targetComments: numVal("gc-targetComments"), targetCompletion: numVal("gc-targetCompletion"),
      duration: numVal("gc-duration"), audience: el("gc-audience").value.trim(), type: el("gc-type").value
    };
  }

  async function run() {
    var d = collect();
    var statusEl = el("gc-status");
    if (!d.url) { statusEl.textContent = "先输入作品链接"; statusEl.className = "status-line err"; return; }
    renderOutput(diagnose(d));
    statusEl.textContent = "诊断完成";
    statusEl.className = "status-line ok";
    await DB.set(LAST_KEY, d);
  }

  async function restoreLast() {
    var d = await DB.get(LAST_KEY, null);
    if (!d) return;
    var map = { url: "gc-url", caption: "gc-caption", views: "gc-views", likes: "gc-likes", comments: "gc-comments",
      completion: "gc-completion", targetViews: "gc-targetViews", targetLikes: "gc-targetLikes",
      targetComments: "gc-targetComments", targetCompletion: "gc-targetCompletion", duration: "gc-duration",
      audience: "gc-audience", type: "gc-type" };
    Object.keys(map).forEach(function (k) { if (d[k] != null && el(map[k])) el(map[k]).value = d[k]; });
  }

  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function copySpan(text) { return '<span class="copy-btn" data-copy="' + encodeURIComponent(text) + '">复制</span>'; }

  function renderOutput(p) {
    var out = el("gc-output");
    var html = "";

    html += '<div class="panel"><h3>增长准备度</h3>' +
      '<div class="score-wrap"><div class="score-num">' + p.score + '</div>' +
      '<div class="score-bar-track"><div class="score-bar-fill" style="width:' + p.score + '%;background:var(--moss)"></div></div></div>' +
      '<p class="hint" style="margin-top:8px">内容诊断评分，不是平台预测</p></div>';

    html += '<div class="panel"><h3>目标倒推</h3><div class="card-grid">' +
      p.target.map(function (x) {
        var parts = x.split("：");
        return '<div class="metric-card"><div class="m-label">' + parts[0] + '</div><div class="m-value">' + escHtml(parts.slice(1).join("：")) + '</div></div>';
      }).join("") + '</div></div>';

    html += '<div class="panel"><h3>当前瓶颈</h3><div class="item-list">' +
      p.bottlenecks.map(function (x) { return '<div class="item hot">' + escHtml(x) + '</div>'; }).join("") +
      p.wins.map(function (x) { return '<div class="item win">' + escHtml(x) + '</div>'; }).join("") +
      '</div></div>';

    html += '<div class="panel"><h3>① 前3秒 / 完播</h3><div class="item-list">' +
      p.opening.concat(p.retention).map(function (x, i) { return '<div class="item"><b>' + (i + 1) + '.</b> ' + escHtml(x) + '</div>'; }).join("") +
      '</div></div>';

    html += '<div class="panel"><h3>② 评论互动</h3><div class="item-list">' +
      p.interaction.map(function (x) { return '<div class="item">' + escHtml(x) + copySpan(x) + '</div>'; }).join("") +
      '</div><p class="field-note" style="margin-top:8px">建议只选一个作为置顶评论，避免同时抛出多个问题。</p></div>';

    html += '<div class="panel"><h3>③ A/B 开头</h3><div class="item-list">' +
      p.ab.map(function (x) { return '<div class="item">' + escHtml(x) + copySpan(x) + '</div>'; }).join("") +
      '</div></div>';

    html += '<div class="panel"><h3>④ 发布后复盘顺序</h3><div class="item-list">' +
      ['先看 3 秒 / 5 秒留存 → 判断是不是开头问题。', '再看平均观看时长 / 完播 → 判断中段节奏。',
       '再看点赞率 → 判断内容价值或情绪回报。', '最后看评论率 → 判断讨论设计是否成立。']
        .map(function (x, i) { return '<div class="item">' + (i + 1) + '. ' + x + '</div>'; }).join("") +
      '</div></div>';

    out.innerHTML = html;
    out.querySelectorAll("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () {
        navigator.clipboard && navigator.clipboard.writeText(decodeURIComponent(b.getAttribute("data-copy"))).then(function () {
          var old = b.textContent; b.textContent = "已复制"; setTimeout(function () { b.textContent = old; }, 1200);
        });
      });
    });
  }

  global.GrowthCopilot = { render: render };
})(window);
