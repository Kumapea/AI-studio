/* AI制片台 V3 — 多AI网页交接：不需要API Key，负责打开并自动填入任务。 */
(function (global) {
  "use strict";
  var SITES = {
    deepseek: { label: "DeepSeek", url: "https://chat.deepseek.com/", matchGlob: "*://chat.deepseek.com/*" },
    kimi: { label: "Kimi", url: "https://www.kimi.com/", matchGlob: "*://*.kimi.com/*" },
    gpt: { label: "GPT", url: "https://chatgpt.com/", matchGlob: "*://chatgpt.com/*" },
    gemini: { label: "Gemini", url: "https://gemini.google.com/", matchGlob: "*://gemini.google.com/*" }
  };
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function waitTabComplete(id){return new Promise(function(resolve){function c(){chrome.tabs.get(id,function(t){if(chrome.runtime.lastError||!t||t.status==='complete')resolve();else setTimeout(c,300);});}c();});}
  async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch(e){return false;}}
  async function sendToChat(providerKey,text){
    var site=SITES[providerKey]; if(!site) throw new Error('未知 AI');
    var copied=await copyText(text);
    var tabs=await chrome.tabs.query({url:site.matchGlob}); var tab=tabs[0];
    if(tab){await chrome.tabs.update(tab.id,{active:true});try{await chrome.windows.update(tab.windowId,{focused:true});}catch(e){}}
    else {tab=await chrome.tabs.create({url:site.url});await waitTabComplete(tab.id);await sleep(1800);}
    for(var i=0;i<5;i++){
      try{var res=await chrome.tabs.sendMessage(tab.id,{type:'STUDIO_FILL_CHAT_INPUT',text:text});if(res&&res.ok)return {ok:true,filled:true,message:'已自动填入 '+site.label+'，请检查后按发送。'};}catch(e){}
      await sleep(700);
    }
    return {ok:true,filled:false,message:(copied?'任务已复制到剪贴板；':'')+'未找到 '+site.label+' 输入框。已打开网页，请粘贴后发送。'};
  }
  global.Handoff={sendToChat:sendToChat,copyText:copyText,SITES:SITES};
})(window);
