/* AI制片台 V4.1 — 多AI网页交接：生成任务后点击 AI，自动打开并填入输入框。无需 API Key。 */
(function (global) {
  "use strict";
  var SITES = {
    deepseek: { label: "DeepSeek", url: "https://chat.deepseek.com/", matchGlob: "*://chat.deepseek.com/*" },
    kimi: { label: "Kimi", url: "https://www.kimi.com/", matchGlob: "*://*.kimi.com/*" },
    gpt: { label: "GPT", url: "https://chatgpt.com/", matchGlob: "*://chatgpt.com/*" },
    gemini: { label: "Gemini", url: "https://gemini.google.com/", matchGlob: "*://gemini.google.com/*" }
  };
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function waitTabComplete(id){return new Promise(function(resolve){
    var done=false;
    function finish(){if(done)return;done=true;resolve();}
    function c(){chrome.tabs.get(id,function(t){if(chrome.runtime.lastError||!t){finish();return;}if(t.status==='complete'){finish();}else setTimeout(c,250);});}
    c(); setTimeout(finish,12000);
  });}
  async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch(e){return false;}}
  async function sendToChat(providerKey,text){
    var site=SITES[providerKey]; if(!site) throw new Error('未知 AI');
    var copied=await copyText(text);
    var tabs=await chrome.tabs.query({url:site.matchGlob});
    var tab=tabs && tabs[0];
    if(tab){
      await chrome.tabs.update(tab.id,{active:true});
      try{await chrome.windows.update(tab.windowId,{focused:true});}catch(e){}
    } else {
      tab=await chrome.tabs.create({url:site.url,active:true});
      await waitTabComplete(tab.id);
      await sleep(2200);
    }
    for(var i=0;i<10;i++){
      try{
        var res=await chrome.tabs.sendMessage(tab.id,{type:'STUDIO_FILL_CHAT_INPUT',text:text});
        if(res&&res.ok)return {ok:true,filled:true,message:'已自动填入 '+site.label+'，现在点击发送即可。'};
      }catch(e){}
      await sleep(600);
    }
    return {ok:true,filled:false,message:(copied?'任务已复制到剪贴板；':'')+'已打开 '+site.label+'，但暂时没找到输入框，请手动粘贴后发送。'};
  }
  global.Handoff={sendToChat:sendToChat,copyText:copyText,SITES:SITES};
})(window);
