/* ============================================================
   prompt-engine.js — 提示词精修（配合 DeepSeek / Kimi 版）
   ------------------------------------------------------------
   不调用任何 API：本地把三套方法论 + 用户的大白话 组装成一份
   完整指令，交给 DeepSeek 或 Kimi 的对话框去生成结果。指令本身
   尽量把七维拆解、运镜五变量都摆全、要求目标平台格式明确写清楚，
   目的是让第一次生成就基本可用，减少来回"抽卡"重跑视频的次数。
   ============================================================ */
(function (global) {
  "use strict";

  function buildInstruction(input) {
    var p = [];
    p.push("你是一名真正做影视分镜与AI视频制作的导演。不要让我选择场景、景别、运镜或动作，你负责判断。请先理解我这段大白话真正想表达的核心情绪、人物关系和情绪转折，再自行选择最合适的成熟影视表达方式。优先沿用经过大量影视作品验证的叙事与镜头逻辑，而不是凭空设计炫技镜头；可以借鉴成熟电影/电视剧的通用拍法，但不要生硬模仿某部具体作品。" );
    p.push("\n### 我的描述（可能很口语、很乱，甚至缺信息）");
    p.push(input);
    p.push("\n### 你的判断原则");
    p.push("1. 核心目标不是把文字写长，而是把最关键的信息写准：核心情绪、情绪转折、人物关系、主体动作、镜头观察方式。用户明确说了想要的情绪时，以此为最高优先级；没有明确说时，从上下文自行判断，不要反问。" );
    p.push("2. 不要要求我选择场景/分镜/景别/运镜。场景只是承载情绪的手段，你自己决定最合理的影视化表达。" );
    p.push("3. 同框的每个主体都必须有符合情境的自然状态。一个人在说话，另一个人不能像背景板一样静止：安排视线、呼吸、手部、身体重心、回应、继续手头事情等细微动作；动物也必须有自然的小动作。" );
    p.push("4. 环境必须有生命力，但不能抢戏。街道可有自然经过的行人、车辆、电动车、店铺进出等；餐厅有服务员和邻桌活动；家庭有生活痕迹；根据实际场景自动补充1～3个合理的背景动态。背景人物通常不要看镜头。" );
    p.push("5. 动作要可执行、连续、真实，不要堆砌大量动作。优先写决定画面成败的动作和一个关键微动作。" );
    p.push("6. 不要堆砌‘电影感、大片感、高级感、震撼、唯美’等空词。需要专业时，用具体的构图、焦段倾向、机位关系、运动方式、光线和人物行为表达。不要为了显得专业而塞进一堆参数。" );
    p.push("7. 最终Prompt控制长度，只保留生成模型真正需要的信息。宁可短而精准，也不要长而啰嗦。" );
    p.push("\n### 请输出");
    p.push("A. 核心情绪：一句话。若存在表层情绪与潜在情绪，用‘表层→潜在→转折’一句话说明。" );
    p.push("B. 最终视频Prompt：一段可以直接使用的中文Prompt。只写关键点，包含主体、核心动作、人物互动/微动作、必要的环境动态、情绪、镜头观察方式；由你自行决定最合适的影视表达。" );
    p.push("C. 一句‘为什么这样拍’：说明你选择这种影视表达是为了服务什么情绪或叙事效果。" );
    return p.join("\n");
  }

  var state = { lastText: "" };
  function el(id) { return document.getElementById(id); }

  function render() {
    var host = el("view-prompt-body");
    if (!host) return;
    host.innerHTML =
      '<div class="panel" style="--accent:var(--tungsten)">' +
        '<h3><span class="step-no">①</span>你只管说人话</h3>' +
        '<p class="hint">不用判断场景、分镜、景别或运镜。把你脑子里的画面和最想要的情绪直接说出来，哪怕很口语、很乱也可以，AI自己判断怎么拍。</p>' +
        '<div class="field"><textarea id="pe-input" placeholder="例如：两个人在街上聊天，表面很轻松，但其中一个人其实知道这是最后一次见面。我想要那种克制、不说破的难过。" rows="6"></textarea></div>' +
      '</div>' +
      '<div class="panel" style="--accent:var(--tungsten)">' +
        '<h3><span class="step-no">②</span>AI导演判断</h3>' +
        '<p class="hint">自动识别核心情绪、人物关系、情绪转折，并调用成熟影视的通用镜头逻辑。自动补足同框人物的小动作和真实环境动态；不堆废话。</p>' +
        '<div class="field"><label>交给哪个免费 AI 网页</label>' +
          '<label class="chip pick on" data-pf="DS">DeepSeek</label>' +
          '<label class="chip pick" data-pf="KIMI">Kimi</label>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row" style="margin:0 0 16px">' +
        '<button class="btn primary" id="pe-run" style="background:var(--tungsten);border-color:var(--tungsten)">▶ 生成精修指令</button>' +
        '<span class="status-line" id="pe-status"></span>' +
      '</div>' +
      '<div id="pe-output"></div>';

    host.querySelectorAll(".chip[data-pf]").forEach(function (c) { c.addEventListener("click", function () { c.classList.toggle("on"); }); });
    el("pe-run").addEventListener("click", run);
  }

  function run() {
    var input = el("pe-input").value.trim();
    var statusEl = el("pe-status");
    if (!input) { statusEl.textContent = "先描述一下你想要的画面"; statusEl.className = "status-line err"; return; }
    state.lastText = buildInstruction(input);
    renderOutput();
    statusEl.textContent = "指令已生成";
    statusEl.className = "status-line ok";
  }

  function renderOutput() {
    var out = el("pe-output");
    out.innerHTML =
      '<div class="output-block">' +
        '<div class="out-head"><h4>AI导演任务已准备好</h4></div>' +
        '<p class="hint">不需要复制这段长指令。直接点下面的 DeepSeek / Kimi，制片台会自动打开并填入。</p>' +
        '<details><summary>查看任务内容</summary><pre id="pe-text-preview">' + escHtml(state.lastText) + '</pre></details>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn" id="pe-copy">复制</button>' +
        '<button class="btn primary" id="pe-send-ds" style="background:#4d6bfe;border-color:#4d6bfe">一键填入 DeepSeek</button>' +
        '<button class="btn primary" id="pe-send-kimi" style="background:#3fcf8e;border-color:#3fcf8e;color:#0f1a14">一键填入 Kimi</button>' +
      '</div>' +
      '<p class="field-note" id="pe-handoff-note" style="margin-top:8px"></p>';

    el("pe-copy").addEventListener("click", async function () {
      var ok = await Handoff.copyText(state.lastText);
      var note = el("pe-handoff-note");
      note.textContent = ok ? "已复制到剪贴板" : "复制失败，请手动选中文本复制";
    });
    el("pe-send-ds").addEventListener("click", function () { handoffClick("deepseek", "pe-send-ds"); });
    el("pe-send-kimi").addEventListener("click", function () { handoffClick("kimi", "pe-send-kimi"); });
  }

  async function handoffClick(provider, btnId) {
    var btn = el(btnId), note = el("pe-handoff-note");
    btn.disabled = true;
    note.textContent = "处理中…";
    try {
      var r = await Handoff.sendToChat(provider, state.lastText);
      note.textContent = r.message;
    } catch (e) {
      note.textContent = "出了点问题：" + (e && e.message || e) + "；指令已复制到剪贴板，手动粘贴即可。";
    } finally {
      btn.disabled = false;
    }
  }

  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  global.PromptEngine = { render: render };
})(window);
