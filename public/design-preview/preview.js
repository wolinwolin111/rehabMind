const icons = {
 back:'<path d="m14 6-6 6 6 6"/>', arrow:'<path d="m9 6 6 6-6 6"/>', down:'<path d="m6 9 6 6 6-6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',
 muscle:'<path d="M5 17c-2-3 0-6 3-7l3-5 3 1 1 5c4 0 6 3 4 6-2 4-10 4-14 0Z"/><path d="m8 10 4 3 3-2M11 5l-1-2"/>',
 joint:'<path d="m8 3 2 6-4 4 3 8m7-18-2 6 4 4-3 8"/><circle cx="12" cy="12" r="2"/>',
 check:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6M10 7v6"/>',
 light:'<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 2H9Z"/>',
 hand:'<path d="M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 7-10 7-13 3l-4-5c-1-2 1-4 3-2l2 2"/>',
 home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>', book:'<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>', person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>', pulse:'<path d="M2 12h5l3-8 4 16 3-8h5"/>'
};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
// Fixed source excerpts used only to compare presentation; production data is untouched.
const findings=[{name:'拉长或活动受限',description:'髋外展拉长时内侧牵拉受限或局部张力改变',goal:'改善长度与活动',methods:['内收肌群手法松解','内收肌拉伸','MET']},{name:'局部敏感',description:'内收肌群触诊或相关活动时出现局部敏感反应',goal:'缓解局部不适',methods:['调整诱发动作负荷','低刺激主动活动']}];
const detail=(f)=>`<div class="understanding"><h4>${icon('light')}如何理解</h4><p>${f.description}</p></div><div class="treatment"><h4>${icon('hand')}处理参考</h4><p class="goal">${f.goal}</p><ul>${f.methods.map(m=>`<li>${m}</li>`).join('')}</ul></div>`;
const context=()=>`<div class="context"><section><h4>${icon('light')}为什么看</h4><p>内收肌群的长度和局部状态可与大腿内侧及膝内侧牵扯感对照。</p></section><section><h4>${icon('check')}检查重点</h4><p>比较内收肌群拉长、局部反应与侧差。</p></section></div>`;
const nav=()=>`<nav class="bottom" aria-label="底部导航预览"><span class="selected">${icon('home')}康复思路</span><span>${icon('pulse')}术后康复</span><span>${icon('book')}资料库</span><span>${icon('person')}我的</span></nav>`;
const configs=[{id:'a',name:'松石白',tag:'分组阅读 · 原位展开',desc:'轻量图标建立分区，展开内容融入同一张卡片。',category:'肌肉状态'},{id:'b',name:'雾蓝',tag:'焦点阅读 · 切换查看',desc:'发现项放在同一排，专注阅读当前一项。',category:'肌肉状态'},{id:'c',name:'藕粉灰',tag:'轻巧列表 · 底部详情',desc:'列表保持简短，详情独立浮起，收起即回到原位。',category:'肌肉状态'}];
document.querySelector('#gallery').innerHTML=(document.body.classList.contains('refined') ? configs.filter(c=>c.id==='c') : configs).map(c=>`<section class="variant ${c.id}" data-variant="${c.id}"><header class="variant-title"><span>${c.id.toUpperCase()}</span><div><h2>${c.name}</h2><p>${c.tag}</p></div></header><div class="phone"><div class="status"><b>9:41</b><span>▥ ▰</span></div><div class="app-top"><span class="back">${icon('back')}</span><span>康复思路</span><span class="side">右侧</span></div><div class="screen"><header class="region"><span>膝关节</span><h2>膝内侧</h2><p>髌骨内下缘 / 膝下内侧区域</p><svg class="knee" viewBox="0 0 80 100" fill="none" aria-hidden="true"><path d="M31 0 37 31Q44 41 34 49L23 62 18 100M50 0 54 30Q64 44 51 56L43 64 38 100M37 31Q22 30 25 44Q28 54 40 51M23 62Q32 56 43 64"/><ellipse cx="45" cy="45" rx="25" ry="21"/></svg></header><div class="categories"><span class="current">${icon('muscle')}肌肉状态</span><span>${icon('joint')}活动度</span><span>${icon('pulse')}能力表现</span></div><div class="section-label"><span>膝内侧相关肌群</span><span>8 项</span></div><article class="muscle-card"><div class="muscle-title"><span class="muscle-symbol">${icon('muscle')}</span><div><h3>内收肌群</h3><span>肌肉状态</span></div><span class="open-mark">${icon('down')}</span></div>${context()}<div class="findings"><h4 class="finding-label">可能发现</h4>${c.id==='a'? findings.map((f,i)=>`<details ${i===0?'open':''}><summary>${f.name}<span>${icon('down')}</span></summary><div class="finding-detail">${detail(f)}</div></details>`).join(''):c.id==='b'?`<div class="finding-tabs" role="tablist" aria-label="可能发现">${findings.map((f,i)=>`<button role="tab" aria-selected="${i===0}" data-finding="${i}">${f.name}</button>`).join('')}</div><div class="focus-detail">${detail(findings[0])}</div>`:findings.map((f,i)=>`<button class="drawer-trigger" data-finding="${i}"><span><i></i>${f.name}</span>${icon('arrow')}</button>`).join('')}</div></article><details class="other"><summary>${icon('muscle')}缝匠肌${icon('down')}</summary><p>缝匠肌参与鹅足区；其长度和局部状态可与膝内下方不适对照。</p></details><details class="other"><summary>${icon('muscle')}半膜肌${icon('down')}</summary><p>半膜肌位于腘绳肌后内侧深层；拉长和局部反应可与膝后内侧不适对照。</p></details><p class="end-mark">RehabMind</p></div>${nav()}${c.id==='c'?'<div class="drawer-layer" hidden><button class="scrim" aria-label="关闭详情"></button><section class="drawer" role="dialog" aria-modal="true" aria-label="发现详情"><span class="handle"></span><header><div><span>内收肌群</span><h3></h3></div><button class="close" aria-label="关闭详情">'+icon('close')+'</button></header><div class="drawer-content"></div></section></div>':''}</div><p class="caption">${c.desc}</p></section>`).join('');
document.querySelectorAll('.finding-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.finding-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b===button)));document.querySelector('.focus-detail').innerHTML=detail(findings[Number(button.dataset.finding)]);}));
let lastTrigger;
const layer=document.querySelector('.drawer-layer');
document.querySelectorAll('.drawer-trigger').forEach(button=>button.addEventListener('click',()=>{lastTrigger=button;const f=findings[Number(button.dataset.finding)];layer.querySelector('h3').textContent=f.name;layer.querySelector('.drawer-content').innerHTML=detail(f);layer.hidden=false;layer.querySelector('.close').focus();}));
let closingTimer;
const close=()=>{
 if(closingTimer) return;
 const finish=()=>{layer.hidden=true;layer.classList.remove('is-closing');closingTimer=null;lastTrigger?.focus();};
 if(!document.body.classList.contains('refined') || matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
 layer.classList.add('is-closing');closingTimer=setTimeout(finish,220);
};
layer.querySelectorAll('.close,.scrim').forEach(b=>b.addEventListener('click',close));
layer.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.key==='Tab'){event.preventDefault();layer.querySelector('.close').focus();}});
document.querySelectorAll('[data-select]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-select]').forEach(b=>b.classList.toggle('active',b===button));document.querySelector('#gallery').dataset.selected=button.dataset.select;}));

if(document.body.classList.contains('refined')) {
 const root=document.querySelector('.variant');
 root.querySelector('.variant-title').remove();
 root.querySelector('.caption').remove();
 root.querySelectorAll('.knee,.muscle-symbol,.categories svg,.context h4 svg,.other summary svg:first-child,.open-mark').forEach(el=>el.remove());
 root.querySelector('.region').insertAdjacentHTML('beforeend','<span class="region-tag">右侧 · 膝</span>');
 root.querySelector('.muscle-title div > span').textContent='膝内侧相关肌群';
 root.querySelector('.context section:nth-child(2) h4').insertAdjacentHTML('afterbegin',icon('check'));
 root.querySelectorAll('.drawer-trigger i').forEach(el=>el.remove());
 root.querySelector('.app-top .side').textContent='部位';
 document.querySelectorAll('.drawer-trigger').forEach(button=>button.addEventListener('click',()=>{
  layer.querySelectorAll('.understanding h4 svg,.treatment h4 svg').forEach(el=>el.remove());
  layer.querySelector('.treatment h4').insertAdjacentHTML('afterbegin',icon('book'));
 }));
}
