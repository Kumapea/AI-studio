/* ============================================================
   db.js — 轻量 IndexedDB 键值封装
   全应用统一走这一层做本地持久化（设置、上次输入、历史记录）。
   不使用 localStorage 作为主存储，因为部分 Electron/Capacitor
   容器对 localStorage 容量限制更严格；IndexedDB 更适合存储
   较大的历史记录（如关键帧缩略图 dataURL）。
   ============================================================ */
(function (global) {
  "use strict";

  var DB_NAME = "ai_video_studio";
  var DB_VERSION = 1;
  var STORE = "kv";
  var _dbPromise = null;

  function openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function (resolve, reject) {
      if (!("indexedDB" in global)) {
        reject(new Error("此环境不支持 IndexedDB"));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return _dbPromise;
  }

  function withStore(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var store = tx.objectStore(STORE);
        var result;
        try {
          result = fn(store);
        } catch (e) {
          reject(e);
          return;
        }
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error("事务中止")); };
      });
    });
  }

  var DB = {
    // 读取一个键；不存在返回 fallback（默认 null）
    get: function (key, fallback) {
      if (fallback === undefined) fallback = null;
      return withStore("readonly", function (store) {
        return new Promise(function (resolve, reject) {
          var r = store.get(key);
          r.onsuccess = function () {
            resolve(r.result === undefined ? fallback : r.result);
          };
          r.onerror = function () { reject(r.error); };
        });
      }).then(function (inner) { return inner; }).catch(function () {
        // IndexedDB 不可用时（极少数受限 webview），退回 localStorage
        try {
          var raw = global.localStorage.getItem("idbfallback:" + key);
          return raw == null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
      });
    },

    set: function (key, value) {
      return withStore("readwrite", function (store) {
        store.put(value, key);
      }).catch(function () {
        try {
          global.localStorage.setItem("idbfallback:" + key, JSON.stringify(value));
        } catch (e) { /* 静默失败，不阻断 UI */ }
      });
    },

    remove: function (key) {
      return withStore("readwrite", function (store) {
        store.delete(key);
      }).catch(function () {
        try { global.localStorage.removeItem("idbfallback:" + key); } catch (e) {}
      });
    },

    // 列出以某前缀开头的所有键（用于历史记录列表）
    keysWithPrefix: function (prefix) {
      return withStore("readonly", function (store) {
        return new Promise(function (resolve, reject) {
          var keys = [];
          var req = store.openKeyCursor ? store.openKeyCursor() : store.openCursor();
          req.onsuccess = function (e) {
            var cursor = e.target.result;
            if (cursor) {
              var k = cursor.key;
              if (typeof k === "string" && k.indexOf(prefix) === 0) keys.push(k);
              cursor.continue();
            } else {
              resolve(keys);
            }
          };
          req.onerror = function () { reject(req.error); };
        });
      }).catch(function () { return []; });
    }
  };

  global.DB = DB;
})(window);
