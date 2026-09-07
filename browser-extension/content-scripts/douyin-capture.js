/* ============================================================
   douyin-capture.js — 运行在抖音页面里的内容脚本
   ------------------------------------------------------------
   职责很窄：找到当前正在播放的 <video>，上报它的位置尺寸和时长，
   并且能按指令跳转到某个时间点（seek 不受跨域限制）。真正的画面
   截取在侧边栏那边用 chrome.tabs.captureVisibleTab 完成（截的是
   整个标签页画面，再按这里上报的坐标裁剪），这样可以绕开跨域视频
   资源导致 canvas "被污染" 无法读取像素的限制。
   ============================================================ */
(function () {
  if (window.__studioDouyinInjected) return;
  window.__studioDouyinInjected = true;

  function findMainVideo() {
    var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
    if (!videos.length) return null;
    var visible = videos.filter(function (v) {
      var r = v.getBoundingClientRect();
      return r.width > 80 && r.height > 80 && r.bottom > 0 && r.top < window.innerHeight;
    });
    var pool = visible.length ? visible : videos;
    pool.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return pool[0];
  }

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg.type === "STUDIO_DOUYIN_GET_INFO") {
      var v = findMainVideo();
      if (!v || !isFinite(v.duration) || v.duration <= 0) {
        sendResponse({ ok: false, error: "没有在页面上找到正在播放的视频，请先打开一个抖音视频并确保开始播放过" });
        return;
      }
      window.__studioVideoEl = v;
      var r = v.getBoundingClientRect();
      sendResponse({
        ok: true,
        duration: v.duration,
        wasPlaying: !v.paused,
        dpr: window.devicePixelRatio || 1,
        rect: { x: r.left, y: r.top, width: r.width, height: r.height }
      });
      return;
    }

    if (msg.type === "STUDIO_DOUYIN_SEEK") {
      var video = window.__studioVideoEl || findMainVideo();
      if (!video) { sendResponse({ ok: false }); return; }
      video.pause();
      var done = false;
      var finish = function () { if (!done) { done = true; sendResponse({ ok: true }); } };
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = Math.min(msg.time, Math.max(0, video.duration - 0.05));
      setTimeout(finish, 700);
      return true; // 异步响应
    }

    if (msg.type === "STUDIO_DOUYIN_RESUME") {
      var v2 = window.__studioVideoEl || findMainVideo();
      if (v2 && msg.wasPlaying) { v2.play().catch(function () {}); }
      sendResponse({ ok: true });
      return;
    }
  });
})();
