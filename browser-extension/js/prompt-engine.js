/* AI制片台 V4.2 — 提示词精修：场景语境 + 大白话 → AI导演任务 → LibTV Prompt */
(function(global){'use strict';
var state={lastText:'',lastInput:'',lastContext:''};
function el(id){return document.getElementById(id)}
function buildInstruction(input,context){
 return `你是资深影视导演、分镜导演和 AI 视频生成导演。

【最高优先级：场景语境】
${context||'没有额外语境；以原始描述中明确出现的地点、时间、人物位置、空间关系和道具为准。'}

【原始大白话】
${input}

【你的任务】
把我的大白话直接翻译成可执行的影视镜头和可直接使用的 LibTV 中文 Prompt。不要让我填写景别、构图、机位、焦段或运镜。你负责判断。

【硬规则】
1. 场景语境是硬约束。原始描述或语境明确写了地点、时间、人物所在位置、空间关系、道具，就必须保留，禁止擅自换成相似场景。例如“车内主驾驶位”绝不能变成沙发、客厅、床、办公室。
2. 我已经写出的景别、机位、视角、运镜、动作、情绪等要求必须保留；只补缺失部分。
3. 先理解故事和动作，再决定怎么拍。不要为了显得专业堆砌参数。
4. 动作必须连续、可拍、可生成：写清起始状态→变化→反应→结束状态。
5. 人物表情、眼神、身体重心、手部/爪子位置等，在真正影响画面的地方写具体。
6. 同框人物和环境只补少量自然微动作，不抢主体。
7. 不要使用“电影感、大片感、高级感、震撼、唯美、8K”等空泛词代替具体画面。
8. 如果人物/动物有特殊结构，严格保持结构，不增加多余肢体。
9. 不要反问我，不要让我做选择。信息不足时做最稳妥、最常规的影视判断。

【输出】
A｜镜头设计：景别、机位、构图、运镜。
B｜动作与表演：按动作先后写清楚，包含关键表情/视线/身体反应。
C｜环境与光线：只写真正影响画面的信息。
D｜最终 LibTV Prompt：一段可以直接复制给 LibTV 的中文提示词，短、准、完整，严格遵守场景语境。
E｜关键导演提醒：只说一个最容易生成错的点。

只输出以上五项，不绕弯。`;
}
function render(){var host=el('view-prompt-body');if(!host)return;host.innerHTML=`<div class="scene-box"><label>场景语境（可选，但你写了就视为硬约束）</label><textarea id="pe-context" placeholder="例如：2026年国庆上午，车内，国庆一直坐在主驾驶位，车辆正在行驶。人物位置、时间、地点、道具都可以写这里。"></textarea></div><div class="scene-box"><label>大白话剧本 / 画面描述</label><textarea id="pe-input" style="min-height:130px" placeholder="例如：国庆在车内主驾驶躺着，突然坐起来，看向前方，表情有点懵。"></textarea></div><div class="nav-row"><button class="btn primary" id="pe-run">生成提示词任务</button><span class="status-line" id="pe-status"></span></div><div id="pe-output" class="result"></div>`;
 try{el('pe-context').value=localStorage.getItem('studio:promptContext')||''}catch(e){};el('pe-context').addEventListener('input',function(){try{localStorage.setItem('studio:promptContext',this.value)}catch(e){}});el('pe-run').onclick=run;}
function run(){var input=el('pe-input').value.trim(),context=el('pe-context').value.trim();if(!input){el('pe-status').textContent='先写一句你想拍什么。';el('pe-status').className='status-line err';return}state.lastInput=input;state.lastContext=context;state.lastText=buildInstruction(input,context);el('pe-status').textContent='任务已生成';el('pe-status').className='status-line ok';el('pe-output').innerHTML=`<div class="output-block"><div class="out-head"><h4>已经准备好</h4></div><p class="hint">点击一个 AI，自动打开对应网页并填入。你只需要点击发送。</p><details><summary>查看完整任务</summary><pre>${esc(state.lastText)}</pre></details><div class="ai-actions"><button class="btn primary" data-ai="deepseek">DeepSeek</button><button class="btn primary" data-ai="kimi">Kimi</button><button class="btn primary" data-ai="gpt">GPT</button><button class="btn primary" data-ai="gemini">Gemini</button><button class="btn" id="pe-copy">复制</button></div><p class="hint" id="pe-note"></p></div>`;el('pe-copy').onclick=async function(){var ok=await Handoff.copyText(state.lastText);el('pe-note').textContent=ok?'已复制。':'复制失败。'};document.querySelectorAll('#pe-output [data-ai]').forEach(function(b){b.onclick=async function(){el('pe-note').textContent='正在打开 '+b.dataset.ai+'…';try{var r=await Handoff.sendToChat(b.dataset.ai,state.lastText);el('pe-note').textContent=r.message||'已填入，请点击发送。'}catch(e){el('pe-note').textContent='自动填入失败，任务已复制。';try{await Handoff.copyText(state.lastText)}catch(x){}}}});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
global.PromptEngine={render:render};})(window);
