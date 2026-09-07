/* ============================================================
   video-analyzer.js — 视频分析（配合 DeepSeek / Kimi 版）
   ------------------------------------------------------------
   两条取帧路径：
   ① 从当前抖音标签页直接抓（用 chrome.tabs.captureVisibleTab 截
      整个标签页画面，再按内容脚本上报的视频位置裁剪——这样绕开了
      跨域视频资源导致 canvas 没法读像素的限制，但代价是"实验性"：
      抖音页面结构以后可能会变，找不到视频时会明确提示，改用②即可）
   ② 上传本地视频文件（纯前端 canvas 逐帧采样，不经过网络，稳定可靠）
   拿到关键帧后：可以打包成 zip 下载，再手动拖进 DeepSeek / Kimi 的
   上传框——浏览器不允许网页脚本自动帮你选文件，这一步必须手动，
   但配套的"分析指令"文字可以自动复制/填入对话框。
   ============================================================ */
(function (global) {
  "use strict";

  var state = { frames: [], includeAction: false };
  function el(id) { return document.getElementById(id); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtTime(t) { var m = Math.floor(t / 60), s = (t % 60).toFixed(1); return (m > 0 ? m + "分" : "") + s + "秒"; }

  /* ---------------- 路径①：抖音当前标签页 ---------------- */

  function sendToTab(tabId, msg) {
    return new Promise(function (resolve, reject) {
      chrome.tabs.sendMessage(tabId, msg, function (res) {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        resolve(res);
      });
    });
  }

  function cropDataUrl(dataUrl, rect, dpr) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = function () { reject(new Error("截图裁剪失败")); };
      img.src = dataUrl;
    });
  }

  async function findDouyinTab() {
    var active = await chrome.tabs.query({ url: "*://*.douyin.com/*", active: true, lastFocusedWindow: true });
    if (active[0]) return active[0];
    var any = await chrome.tabs.query({ url: "*://*.douyin.com/*" });
    return any[0] || null;
  }

  function smartFrameCount(duration, mode) {
    if (!isFinite(duration) || duration <= 0) return 24;
    if (mode === "dense") return Math.min(300, Math.max(24, Math.ceil(duration * 1.5)));
    if (mode === "medium") return Math.min(220, Math.max(18, Math.ceil(duration * 0.9)));
    return Math.min(180, Math.max(12, Math.ceil(duration * 0.6)));
  }

  function getFrameCount(duration) {
    var mode = el("va-count").value;
    if (mode === "smart") return smartFrameCount(duration, "smart");
    if (mode === "medium") return smartFrameCount(duration, "medium");
    if (mode === "dense") return smartFrameCount(duration, "dense");
    return Math.max(12, +mode || 24);
  }

  async function captureFromDouyin(count, onProgress) {
    var tab = await findDouyinTab();
    if (!tab) throw new Error("没有找到打开的抖音标签页，请先在浏览器里打开一个抖音视频页面");

    var info;
    try { info = await sendToTab(tab.id, { type: "STUDIO_DOUYIN_GET_INFO" }); }
    catch (e) { throw new Error("联系不上抖音页面（可能是页面还没加载完，刷新一下抖音页面再试）"); }
    if (!info || !info.ok) throw new Error(info && info.error || "没有在抖音页面上找到正在播放的视频");

    var duration = info.duration, dpr = info.dpr || 1;
    count = getFrameCount(duration);
    var positions = [];
    for (var i = 0; i < count; i++) positions.push(duration * (i + 0.5) / count);

    var frames = [];
    for (var idx = 0; idx < positions.length; idx++) {
      if (onProgress) onProgress(idx + 1, positions.length);
      await sendToTab(tab.id, { type: "STUDIO_DOUYIN_SEEK", time: positions[idx] });
      await sleep(220);
      var shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 90 });
      var cropped = await cropDataUrl(shot, info.rect, dpr);
      frames.push({ time: positions[idx], dataUrl: cropped });
    }
    sendToTab(tab.id, { type: "STUDIO_DOUYIN_RESUME", wasPlaying: info.wasPlaying }).catch(function () {});
    return frames;
  }

  /* ---------------- 路径②：本地视频文件 ---------------- */

  function loadVideoEl(file) {
    return new Promise(function (resolve, reject) {
      var v = document.createElement("video");
      v.preload = "auto"; v.muted = true; v.playsInline = true;
      v.src = URL.createObjectURL(file);
      v.onloadedmetadata = function () { resolve(v); };
      v.onerror = function () { reject(new Error("视频文件无法解析，试试 mp4/webm/mov 格式")); };
    });
  }
  function seekTo(video, t) {
    return new Promise(function (resolve) {
      var done = false, finish = function () { if (!done) { done = true; resolve(); } };
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = Math.min(t, Math.max(0, video.duration - 0.05));
      setTimeout(finish, 800);
    });
  }

  async function captureFromFile(file, count, onProgress) {
    var video = await loadVideoEl(file);
    var duration = video.duration;
    if (!isFinite(duration) || duration <= 0) throw new Error("无法读取视频时长");
    count = getFrameCount(duration);
    var canvas = document.createElement("canvas");
    var frames = [];
    for (var i = 0; i < count; i++) {
      var t = duration * (i + 0.5) / count;
      if (onProgress) onProgress(i + 1, count);
      await seekTo(video, t);
      canvas.width = 640; canvas.height = Math.round(640 * (video.videoHeight / video.videoWidth || 1.78));
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ time: t, dataUrl: canvas.toDataURL("image/jpeg", 0.85) });
    }
    URL.revokeObjectURL(video.src);
    return frames;
  }

  /* ---------------- 分析指令构建 ---------------- */

  function buildInstruction(frameCount) {
    var p = [];
    p.push("你是一名电影/电视剧导演、摄影指导和视频拆解师。我会上传 " + frameCount + " 张同一条视频按时间顺序截取的画面。不要凭空发明镜头，也不要让我选择镜头类型。请从现有成功影视作品已经验证过的叙事和镜头逻辑出发，反推这条视频为什么这样拍，以及哪些方法可以迁移到我的AI视频制作中。" );
    p.push("\n### 分析原则");
    p.push("1. 先判断视频最关键的情绪、人物关系、信息点和情绪转折，再解释镜头为什么这样服务它。" );
    p.push("2. 优先识别成熟影视中常见且有效的镜头逻辑（如建立空间、跟随、反应、对话调度、视线关系、信息延迟、情绪落点等），不要为了显得专业而创造炫技镜头。" );
    p.push("3. 分析动作连续性：同框人物都要有自然的小动作和相互反应，不能把非主角当背景板；动物也要符合情境地活动。" );
    p.push("4. 分析环境生命力：街道中的行人、车辆、电动车、店铺活动，家庭中的生活痕迹等，要判断哪些背景动态增强真实感，同时避免抢主体。" );
    p.push("5. 关键帧只是证据，不要把看不出来的参数说成确定事实。无法确定的焦段、光圈等给出合理倾向或区间即可，不要堆参数。" );
    p.push("6. 最终目的是让我复用成功经验，不是把视频机械抄成一堆分镜表。重点告诉我：它真正有效的地方是什么，我应该怎么迁移。" );
    p.push("\n### 请按以下结构输出");
    p.push("A. 一句话总结：这条视频真正抓人的核心情绪/情绪转折是什么。" );
    p.push("B. 镜头逻辑：按时间顺序概括关键镜头节点，只写真正发生变化的地方；说明每个镜头服务的叙事目的。" );
    p.push("C. 人物与动作：指出主体动作、同框人物微动作、视线/回应以及动作前后关系。" );
    p.push("D. 环境生命力：指出背景中哪些人、车辆、动物或生活活动让画面真实，以及如何控制背景不抢戏。" );
    p.push("E. 可迁移的影视方法：提炼3～6条已经被成熟影视语言验证的做法，不需要虚构具体影片名称；如果能明确对应某种经典影视表达类型，可以说明类型。" );
    p.push("F. AI视频复现Prompt：只给一段精炼、精准、可直接使用的中文Prompt。只保留关键点：主体、核心动作、人物互动/微动作、环境动态、核心情绪、镜头观察方式。不要堆砌空泛形容词和无意义参数。" );
    p.push("G. 最值得复制的一点：如果只能学这条视频一个方法，选出最关键的一点并说明原因。" );
    return p.join("\n");
  }

  /* ---------------- UI ---------------- */

  function render() {
    var host = el("view-video-body");
    if (!host) return;
    host.innerHTML =
      '<div class="panel" style="--accent:var(--daylight)">' +
        '<h3><span class="step-no">①</span>抓取关键帧 —— 两种方式二选一</h3>' +
        '<p class="hint">方式A：正在抖音网页看某个视频，直接从当前标签页抓（实验性，抖音改版可能导致找不到视频，那就换方式B）。方式B：上传本地视频文件，纯本机处理，更稳。</p>' +
        '<div class="row">' +
          '<div class="field"><label>抽帧密度</label><select id="va-count"><option value="smart" selected>智能（按时长自动增加）</option><option value="medium">中密度（约0.9帧/秒）</option><option value="dense">高密度（约1.5帧/秒）</option><option value="24">24帧</option><option value="48">48帧</option><option value="96">96帧</option><option value="180">180帧</option></select><small class="field-note">不再限制 6/10 帧。长视频会自动提高数量，最长默认约180帧。</small></div>' +
          '<div class="field"><label>&nbsp;</label><button class="btn primary" id="va-douyin" style="background:var(--daylight);border-color:var(--daylight)">方式A：从当前抖音标签页抓取</button></div>' +
        '</div>' +
        '<div class="field"><label>方式B：或上传本地视频文件</label><input type="file" id="va-file" accept="video/*"></div>' +
        '<div class="btn-row"><button class="btn" id="va-file-run">从文件提取</button><span class="status-line" id="va-status"></span></div>' +
        '<div id="va-frames" class="frame-grid"></div>' +
      '</div>' +
      '<div class="panel" id="va-step2" style="display:none;--accent:var(--daylight)">' +
        '<h3><span class="step-no">②</span>整理分析材料</h3>' +
        '<p class="hint">关键帧默认按时间密度抓取，后续可以点选去掉明显重复帧。分析重点由 AI 自己判断：情绪、人物关系、镜头逻辑、动作连续性和环境生命力。</p>' +
        '<div class="btn-row">' +
          '<button class="btn" id="va-download-zip">打包下载关键帧（.zip）</button>' +
          '<button class="btn primary" id="va-build" style="background:var(--daylight);border-color:var(--daylight)">生成 AI 分析任务</button>' +
        '</div>' +
        '<p class="field-note">浏览器不允许网页脚本代你选文件，图片这一步需要你自己把下载好的图拖进 DeepSeek / Kimi 的上传框——指令文字可以自动复制/填入，图片手动拖一下就行。</p>' +
      '</div>' +
      '<div id="va-output"></div>';

    el("va-douyin").addEventListener("click", runDouyin);
    el("va-file-run").addEventListener("click", runFile);
    el("va-download-zip").addEventListener("click", downloadZip);
    el("va-build").addEventListener("click", buildAndShow);
  }

  async function runDouyin() {
    var statusEl = el("va-status");
    var count = +el("va-count").value;
    statusEl.textContent = "正在联系抖音页面…";
    statusEl.className = "status-line busy";
    el("va-douyin").disabled = true;
    try {
      var frames = await captureFromDouyin(count, function (done, total) {
        statusEl.textContent = "抓取中 " + done + "/" + total;
      });
      state.frames = frames;
      renderFrames();
      statusEl.textContent = "已抓取 " + frames.length + " 帧";
      statusEl.className = "status-line ok";
      el("va-step2").style.display = "";
    } catch (e) {
      statusEl.textContent = e.message || String(e);
      statusEl.className = "status-line err";
    } finally {
      el("va-douyin").disabled = false;
    }
  }

  async function runFile() {
    var statusEl = el("va-status");
    var fileInput = el("va-file");
    if (!fileInput.files || !fileInput.files[0]) { statusEl.textContent = "先选一个视频文件"; statusEl.className = "status-line err"; return; }
    var count = +el("va-count").value;
    statusEl.textContent = "正在提取…";
    statusEl.className = "status-line busy";
    el("va-file-run").disabled = true;
    try {
      var frames = await captureFromFile(fileInput.files[0], count, function (done, total) {
        statusEl.textContent = "提取中 " + done + "/" + total;
      });
      state.frames = frames;
      renderFrames();
      statusEl.textContent = "已提取 " + frames.length + " 帧";
      statusEl.className = "status-line ok";
      el("va-step2").style.display = "";
    } catch (e) {
      statusEl.textContent = e.message || String(e);
      statusEl.className = "status-line err";
    } finally {
      el("va-file-run").disabled = false;
    }
  }

  function renderFrames() {
    var host = el("va-frames");
    host.innerHTML = state.frames.map(function (f, i) {
      return '<div class="frame picked" data-idx="' + i + '"><img src="' + f.dataUrl + '"><span class="f-t">' + fmtTime(f.time) + '</span></div>';
    }).join("");
    host.querySelectorAll(".frame").forEach(function (fEl) { fEl.addEventListener("click", function () { fEl.classList.toggle("picked"); }); });
  }

  function pickedFrames() {
    return Array.prototype.slice.call(document.querySelectorAll("#va-frames .frame.picked"))
      .map(function (fEl) { return state.frames[+fEl.getAttribute("data-idx")]; });
  }

  async function downloadZip() {
    var frames = pickedFrames();
    if (!frames.length) { alert("先抓取/保留至少一个关键帧"); return; }
    var zip = new JSZip();
    frames.forEach(function (f, i) {
      var base64 = f.dataUrl.split(",")[1];
      zip.file("frame_" + String(i + 1).padStart(2, "0") + ".jpg", base64, { base64: true });
    });
    var blob = await zip.generateAsync({ type: "blob" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "关键帧.zip";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }

  function buildAndShow() {
    var frames = pickedFrames();
    if (!frames.length) { alert("先抓取/保留至少一个关键帧"); return; }
    var text = buildInstruction(frames.length);
    var out = el("va-output");
    out.innerHTML =
      '<div class="output-block"><div class="out-head"><h4>AI分析任务已准备好</h4></div><p class="hint">图片仍需你手动上传到 DeepSeek / Kimi；文字任务可以一键填入。AI 会自己判断核心情绪、镜头逻辑、人物小动作和环境动态。</p><details><summary>查看任务内容</summary><pre>' + escHtml(text) + '</pre></details></div>' +
      '<div class="btn-row">' +
        '<button class="btn" id="va-copy">复制指令</button>' +
        '<button class="btn primary" id="va-send-ds" style="background:#4d6bfe;border-color:#4d6bfe">在 DeepSeek 中打开并填入</button>' +
        '<button class="btn primary" id="va-send-kimi" style="background:#3fcf8e;border-color:#3fcf8e;color:#0f1a14">在 Kimi 中打开并填入</button>' +
      '</div><p class="field-note" id="va-handoff-note" style="margin-top:8px"></p>';
    el("va-copy").addEventListener("click", async function () {
      var ok = await Handoff.copyText(text);
      el("va-handoff-note").textContent = ok ? "已复制到剪贴板，记得也把关键帧图片拖进去" : "复制失败，手动选中文字复制";
    });
    el("va-send-ds").addEventListener("click", function () { handoffClick("deepseek", text, "va-send-ds"); });
    el("va-send-kimi").addEventListener("click", function () { handoffClick("kimi", text, "va-send-kimi"); });
  }

  async function handoffClick(provider, text, btnId) {
    var btn = el(btnId), note = el("va-handoff-note");
    btn.disabled = true;
    note.textContent = "处理中…";
    try {
      var r = await Handoff.sendToChat(provider, text);
      note.textContent = r.message + "（图片记得手动拖进去一起发）";
    } catch (e) {
      note.textContent = "出了点问题，指令已复制到剪贴板：" + (e && e.message || e);
    } finally {
      btn.disabled = false;
    }
  }

  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  global.VideoAnalyzer = { render: render };
})(window);
