const paths={down:'<path d="m6 9 6 6 6-6"/>',right:'<path d="m9 6 6 6-6 6"/>',back:'<path d="m14 6-6 6 6 6"/>',person:'<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>',book:'<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 12h6m-6 4h4"/>',battery:'<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4M5 9h12v6H5z"/>',signal:'<path d="M3 19v-3m5 3v-6m5 6V9m5 10V5"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shared={primary:'#90AFDE',secondary:'#9FD9D9',tertiary:'#EDC98C',card:'#90AFDE',action:'#9FD9D9',soft:'#9FD9D9'};
const palettes=[
 {id:1,name:'浅青白',desc:'底色 #EAF8F8 · 清透的冷色底',page:'#EAF8F8'},
 {id:2,name:'淡翠绿',desc:'底色 #CDEDDE · 柔和的绿色底',page:'#CDEDDE'},
 {id:3,name:'米杏白',desc:'底色 #FBF7EF · 更接近白色，保留轻微暖杏色',page:'#FBF7EF'},
].map(p=>({...shared,...p,colors:[shared.primary,shared.tertiary,shared.secondary,p.page]}));
let sample,view='reasoning',dimension='MUSCLE_STATE',activeFinding;
const gallery=document.querySelector('#gallery');
try{const r=await fetch('./sample.json');if(!r.ok)throw Error();sample=await r.json();}catch{gallery.textContent='暂时无法载入参考内容，请刷新页面。';}
const flatten=d=>d.groups.flatMap(g=>g.items);
const expandable=(title,body,open=false,cls='')=>`<section class="panel ${cls}"><button class="expand-head" aria-expanded="${open}"><span>${title}</span><span class="chevron">${icon('down')}</span></button><div class="expansion${open?' open':''}" ${open?'':'inert'}><div class="clip">${body}</div></div></section>`;
const nav=()=>`<nav class="bottom" aria-label="底部导航样式">${[['home','康复思路'],['clipboard','术后康复'],['book','资料库'],['person','我的']].map(([i,l],n)=>`<span class="${n===0?'active':''}">${icon(i)}${l}</span>`).join('')}</nav>`;
function itemCard(item,open=false){
 const treatment=item.possible_findings.find(f=>f.treatment_goals?.length);
 return expandable(esc(item.name),`<div class="content"><h4>检查重点</h4><p>${esc(item.check_focus)}</p><h4>可能发现</h4><div class="finding-list">${item.possible_findings.map((f,i)=>`<button class="finding-link" data-item="${esc(item.item_id)}" data-finding="${i}"><span>${esc(f.name)}</span>${icon('right')}</button>`).join('')}</div>${treatment?`<div class="treatment-preview"><strong>${icon('book')}处理参考 · ${esc(treatment.name)}</strong><p>${treatment.treatment_goals.flatMap(g=>g.methods).slice(0,2).map(esc).join('<br>')}</p></div>`:''}</div>`,open);
}
function reasoning(){
 const d=sample.dimensions.find(d=>d.key===dimension);
 return expandable(`<span class="title-icon">${icon('person')}患者与症状信息</span>`,`<div class="content"><div class="profile"><label>年龄<input aria-label="年龄" type="number" min="0" max="120" placeholder="未填写" style="display:block;width:100%;padding:9px;margin-top:8px;border:1px solid var(--line);border-radius:7px;font:inherit"></label><label>性别<select><option>未填写</option><option>男</option><option>女</option></select></label></div></div>`,false,'info')+
 `<div class="tabs" aria-label="评估方向">${sample.dimensions.filter(d=>flatten(d).length).map(d=>`<button data-dimension="${esc(d.key)}" aria-pressed="${d.key===dimension}">${esc(d.label)}</button>`).join('')}</div>`+
 d.groups.map(g=>{const main=g.items.filter(i=>i.display_mode==='DEFAULT').sort((a,b)=>(b.item_id==='CORE-MUS-VM')-(a.item_id==='CORE-MUS-VM')),other=g.items.filter(i=>i.display_mode!=='DEFAULT');return `<div class="group-heading"><span>${esc(g.name)}</span><span>${main.length} 项</span></div>${main.map((item,i)=>itemCard(item,i===0)).join('')}${other.length?`<details class="related"><summary>其他相关项目 · ${other.length} 项</summary>${other.map(i=>itemCard(i)).join('')}</details>`:''}`;}).join('');
}
function finding(){
 const {item,f}=activeFinding;
 return `<div class="detail"><header class="detail-title"><small>${esc(item.name)}</small><h3>${esc(f.name)}</h3></header><section><h4>${icon('search')}如何理解</h4><p>${esc(f.trigger_condition)}</p></section>${f.treatment_goals.length?`<section class="treatment"><h4>${icon('book')}处理参考</h4><div class="methods">${f.treatment_goals.map(g=>`<div class="method-group"><small>${esc(g.goal)}</small><ul>${g.methods.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`).join('')}</div></section>`:''}${f.display_note?`<section><h4>${esc(f.display_note.label)}</h4><p>${esc(f.display_note.text)}</p></section>`:''}<button class="detail-back" data-return>${icon('back')}返回检查项目</button></div>`;
}
function render(){
 gallery.innerHTML=palettes.map(p=>`<article class="variant ${p.id===selectedPalette?'chosen':''}" data-palette="${p.id}" style="${['primary','secondary','tertiary','card','action','page','soft'].map(k=>`--${k}:${p[k]}`).join(';')};${p.lightInk?'--head-ink:#fff;--action-ink:#fff':''}"><header class="variant-heading"><span class="number">底色 ${p.id}</span><div><h2>${p.name}</h2><p>${p.desc}</p></div></header><div class="swatches" aria-label="主色与底色色号">${p.colors.map(c=>`<span style="background:${c};${c==='#3E67C7'?'color:white':''}">${c}</span>`).join('')}</div><div class="phone"><div class="status"><span>9:41</span><span class="signals">${icon('signal')}${icon('battery')}</span></div><header class="app-head"><div class="topline"><span class="back">${icon('back')}康复思路</span><span class="side">右侧 · 大腿</span></div><h2>大腿前内侧</h2><div class="subline">股内侧肌邻近</div></header><div class="screen">${view==='reasoning'?reasoning():finding()}</div>${nav()}</div></article>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
}
let selectedPalette=Number(new URLSearchParams(location.search).get('palette'))||1;
if(![1,2,3].includes(selectedPalette))selectedPalette=1;
function setView(v){view=v;render();}
if(sample){const item=flatten(sample.dimensions[0]).find(i=>i.item_id==='CORE-MUS-VM')||flatten(sample.dimensions[0])[0];activeFinding={item,f:item.possible_findings.find(f=>f.treatment_goals.length)||item.possible_findings[0]};render();}
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




