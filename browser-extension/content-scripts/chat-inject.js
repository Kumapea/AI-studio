(function(){
  'use strict';
  function visible(el){var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>10&&r.height>10&&s.display!=='none'&&s.visibility!=='hidden';}
  function findInput(){
    var sels=[
      'textarea[placeholder*="Message"]','textarea[placeholder*="消息"]','textarea[placeholder*="Ask"]','textarea[placeholder*="输入"]',
      'div[contenteditable="true"][role="textbox"]','div[contenteditable="true"]','textarea'
    ];
    for(var i=0;i<sels.length;i++){var a=[].slice.call(document.querySelectorAll(sels[i])).filter(visible);if(a.length)return a[a.length-1];}
    return null;
  }
  function fill(el,text){
    el.focus();
    if(el.tagName==='TEXTAREA'){
      var proto=Object.getPrototypeOf(el),desc=Object.getOwnPropertyDescriptor(proto,'value');
      if(desc&&desc.set)desc.set.call(el,text);else el.value=text;
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }else{
      el.innerHTML='';var p=document.createElement('p');p.textContent=text;el.appendChild(p);
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
    }
    try{el.scrollIntoView({block:'center'});}catch(e){}
  }
  chrome.runtime.onMessage.addListener(function(msg,send,reply){
    if(msg&&msg.type==='STUDIO_FILL_CHAT_INPUT'){
      var el=findInput();if(!el){reply({ok:false,error:'未找到输入框'});return true;}
      fill(el,msg.text);reply({ok:true});return true;
    }
  });
})();
