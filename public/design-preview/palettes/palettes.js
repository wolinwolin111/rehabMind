const paths={down:'<path d="m6 9 6 6 6-6"/>',right:'<path d="m9 6 6 6-6 6"/>',back:'<path d="m14 6-6 6 6 6"/>',person:'<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>',book:'<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 12h6m-6 4h4"/>',battery:'<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4M5 9h12v6H5z"/>',signal:'<path d="M3 19v-3m5 3v-6m5 6V9m5 10V5"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palettes=[
 {id:1,name:'雾蓝 · 鼠尾草 · 燕麦杏',desc:'莫兰迪为主，柔和而清楚',colors:['#98B2C2','#DDE8DF','#EAD8C4','#506E84','#E9EBE7']},
 {id:2,name:'晴空蓝 · 蜜瓜绿 · 杏桃',desc:'清甜马卡龙 · 奶油白底',colors:['#ACCDE3','#D4EFB5','#FFD5AD','#397EAF','#FFF8E9']},
 {id:3,name:'烟蓝 · 灰紫 · 亚麻',desc:'低饱和灰调，安静克制',colors:['#96ADBB','#DDD9E7','#E4DCCB','#536B7D','#EAEBE8']},
];
let sample,view='reasoning',dimension='MUSCLE_STATE',activeFinding;
const gallery=document.querySelector('#gallery');
try{const r=await fetch('./sample.json');if(!r.ok)throw Error();sample=await r.json();}catch{gallery.textContent='暂时无法载入参考内容，请刷新页面。';}
const flatten=d=>d.groups.flatMap(g=>g.items);
const expandable=(title,body,open=false,cls='')=>`<section class="panel ${cls}"><button class="expand-head" aria-expanded="${open}"><span>${title}</span><span class="chevron">${icon('down')}</span></button><div class="expansion${open?' open':''}" ${open?'':'inert'}><div class="clip">${body}</div></div></section>`;
const nav=()=>`<nav class="bottom" aria-label="底部导航样式">${[['home','康复思路'],['clipboard','术后康复'],['book','资料库'],['person','我的']].map(([i,l],n)=>`<span class="${n===0?'active':''}">${icon(i)}${l}</span>`).join('')}</nav>`;
function itemCard(item,open=false){
 return expandable(esc(item.name),`<div class="content"><h4>为什么看</h4><p>${esc(item.clinical_purpose)}</p><div class="check"><h4>检查重点</h4><p>${esc(item.check_focus)}</p></div><h4>可能发现</h4><div class="finding-list">${item.possible_findings.map((f,i)=>`<button class="finding-link" data-item="${esc(item.item_id)}" data-finding="${i}"><span>${esc(f.name)}</span>${icon('right')}</button>`).join('')}</div></div>`,open);
}
function reasoning(){
 const d=sample.dimensions.find(d=>d.key===dimension);
 return expandable(`<span class="title-icon">${icon('person')}患者与症状信息</span>`,`<div class="content"><div class="profile"><label>年龄<input aria-label="年龄" type="number" min="0" max="120" placeholder="未填写" style="display:block;width:100%;padding:9px;margin-top:8px;border:1px solid var(--line);border-radius:7px;font:inherit"></label><label>性别<select><option>未填写</option><option>男</option><option>女</option></select></label></div></div>`,false,'info')+
 `<div class="tabs" aria-label="评估方向">${sample.dimensions.map(d=>`<button data-dimension="${esc(d.key)}" aria-pressed="${d.key===dimension}">${esc(d.label)}</button>`).join('')}</div>`+
 d.groups.map(g=>{const main=g.items.filter(i=>i.display_mode==='DEFAULT'),other=g.items.filter(i=>i.display_mode!=='DEFAULT');return `<div class="group-heading"><span>${esc(g.name)}</span><span>${main.length} 项</span></div>${main.map((item,i)=>itemCard(item,i===0)).join('')}${other.length?`<details class="related"><summary>其他相关项目 · ${other.length} 项</summary>${other.map(i=>itemCard(i)).join('')}</details>`:''}`;}).join('');
}
function finding(){
 const {item,f}=activeFinding;
 return `<div class="detail"><header class="detail-title"><small>${esc(item.name)}</small><h3>${esc(f.name)}</h3></header><section><h4>${icon('search')}如何理解</h4><p>${esc(f.trigger_condition)}</p></section>${f.treatment_goals.length?`<section class="treatment"><h4>${icon('book')}处理参考</h4><div class="methods">${f.treatment_goals.map(g=>`<div class="method-group"><small>${esc(g.goal)}</small><ul>${g.methods.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`).join('')}</div></section>`:''}${f.display_note?`<section><h4>${esc(f.display_note.label)}</h4><p>${esc(f.display_note.text)}</p></section>`:''}<button class="detail-back" data-return>${icon('back')}返回检查项目</button></div>`;
}
function render(){
 gallery.innerHTML=palettes.map(p=>`<article class="variant ${p.id===selectedPalette?'chosen':''}" data-palette="${p.id}"><header class="variant-heading"><span class="number">0${p.id}</span><div><h2>${p.name}</h2><p>${p.desc}</p></div></header><div class="swatches" aria-label="方案${p.id}色板">${p.colors.map(c=>`<span style="background:${c}" title="${c}"></span>`).join('')}</div><div class="phone ${view==='model'?'model-mode':''}"><div class="status"><span>9:41</span><span class="signals">${icon('signal')}${icon('battery')}</span></div><header class="app-head"><div class="topline"><span class="back">${icon('back')}康复思路</span><span class="side">右侧 · 大腿</span></div><h2>大腿前内侧</h2><div class="subline">股内侧肌邻近</div></header><div class="screen">${view==='reasoning'?reasoning():view==='finding'?finding():`<div class="model-view"><span class="model-loading">正在载入人体模型…</span><iframe title="方案${p.id}模型首页配色" data-model="${p.id}" src="/?palette-preview=${p.id}" loading="lazy"></iframe></div>`}</div>${nav()}</div></article>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 // Preview-only styles inside same-origin frames; no production files or
 // stored model preferences are changed by applying a palette.
 document.querySelectorAll('iframe[data-model]').forEach(frame=>frame.addEventListener('load',()=>{
  try{
   const doc=frame.contentDocument,host=frame.closest('.variant'),s=getComputedStyle(host),style=doc.createElement('style');
   style.textContent=`:root{--page:${s.getPropertyValue('--page')};--header-blue:${s.getPropertyValue('--header')};--header-line:${s.getPropertyValue('--header')};--selection:${s.getPropertyValue('--action')};--mint:${s.getPropertyValue('--info')};--surface:#f9faf8;--safe-top:24px;--nav-clearance:80px}html,body,#root{background:var(--page)}.resume-card{background:${s.getPropertyValue('--info')}!important}.page-content--model .anatomy-toolbar{background:var(--header-blue)} `;
   doc.head.append(style);frame.previousElementSibling.remove();
  }catch{frame.previousElementSibling.textContent='请打开本地服务后查看模型。';}
 }));
}
let selectedPalette=Number(new URLSearchParams(location.search).get('palette'))||2;
if(![1,2,3].includes(selectedPalette))selectedPalette=1;
function setView(v){view=v;render();}
if(sample){const item=flatten(sample.dimensions[0]).find(i=>i.item_id==='CORE-MUS-VM');activeFinding={item,f:item.possible_findings[0]};render();}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||!sample)return;
 if(button.dataset.view){setView(button.dataset.view);return;}
 if(button.dataset.choice){selectedPalette=Number(button.dataset.choice);document.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.choice)===selectedPalette)));document.querySelectorAll('.variant').forEach(v=>v.classList.toggle('chosen',Number(v.dataset.palette)===selectedPalette));return;}
 if(button.classList.contains('expand-head')){const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));const content=button.nextElementSibling;content.classList.toggle('open',open);content.inert=!open;return;}
 if(button.dataset.dimension){dimension=button.dataset.dimension;setView('reasoning');return;}
 if(button.dataset.item){const item=sample.dimensions.flatMap(flatten).find(i=>i.item_id===button.dataset.item);activeFinding={item,f:item.possible_findings[Number(button.dataset.finding)]};setView('finding');return;}
 if(button.hasAttribute('data-return'))setView('reasoning');
});
document.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.choice)===selectedPalette)));
