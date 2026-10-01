const paths = {
  back: '<path d="m14 6-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  book: '<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7"/>',
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="3"/><path d="M9 2h6v4H9zM9 13h6m-3-3v6"/>',
  layers: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const designs = [
  { id: 1, name: '清透薄荷', desc: '薄荷白 · 深青绿 · 玻璃圆角组件', colors:['#eaf4f2','#a6dcd2','#315f57','#dfbee7'] },
  { id: 2, name: '薄荷三拼', desc: '浅青薄荷 · 奶油黄 · 淡粉分区', colors:['#c9ebe5','#f2e7bf','#eed7e6','#17201e'] },
  { id: 3, name: '云蓝与月苍白', desc: '云蓝月白渐变 · 薄荷青 · 烟雨白', colors:['#e3e3e5','#afc9de','#d6f0ea','#f9f6e5','#7c9fcd','#5e9c76'] },
  { id: 6, name: '森林鼠尾草', desc: '鼠尾草绿 · 柔白 · 深森林绿', colors:['#dce8d8','#f6f9f3','#003b27','#afc3a5'] },
];
let sample;
try {
  const response = await fetch('./reference-sample.json');
  if (!response.ok) throw new Error('无法读取');
  sample = await response.json();
} catch {
  document.querySelector('#gallery').innerHTML = '<p class="loading">暂时无法载入，请刷新页面。</p>';
}
const expandable = (title, content, open = false, cls = '') => `<section class="expandable ${cls}"><button class="expand-head" type="button" aria-expanded="${open}">${title}<span class="chevron">${icon('down')}</span></button><div class="expansion${open ? ' open' : ''}" aria-hidden="${!open}" ${open ? '' : 'inert'}><div class="expansion-clip">${content}</div></div></section>`;
function renderItem(item, open = false) {
  const reason = item.clinical_purpose ? `<section class="purpose"><h4>为什么看</h4><p>${escape(item.clinical_purpose)}</p></section>` : '';
  const findingRows = item.possible_findings.map(finding => `<button class="finding-link" type="button" data-feature="${escape(finding.feature_id)}" aria-haspopup="dialog"><span>${escape(finding.name)}</span><span class="round-arrow">${icon('right')}</span></button>`).join('');
  return expandable(`<span class="item-name">${escape(item.name)}</span>`, `<div class="item-body">${reason}<section class="check-block"><h4><span class="section-symbol">${icon('search')}</span>检查重点</h4><p>${escape(item.check_focus)}</p></section><section class="findings"><h4>可能发现</h4>${findingRows}</section></div>`, open, 'item-card');
}
function renderDimension(dimension) {
  return dimension.groups.map(group => {
    const items = [...group.items];
    // Same source records, with the example muscle first for visual comparison.
    if (dimension.key === 'MUSCLE_STATE') items.sort((a,b) => Number(b.item_id === 'KNEE-MUS-ADD') - Number(a.item_id === 'KNEE-MUS-ADD'));
    const main = items.filter(item => item.display_mode !== 'EXPAND');
    const other = items.filter(item => item.display_mode === 'EXPAND');
    const visible = main.length ? main : items;
    const additional = main.length ? other : [];
    return `<section class="assessment-group"><header class="group-label"><h3>${escape(group.name)}</h3><span>${items.length} 项</span></header>${visible.map((item,i) => renderItem(item,i === 0)).join('')}${additional.length ? expandable(`<span class="related-title">其他相关项目 <small>${additional.length} 项</small></span>`, `<div class="related-items">${additional.map(item => renderItem(item)).join('')}</div>`, false, 'related-module') : ''}</section>`;
  }).join('');
}
function renderSymptoms() {
  const options = sample.contexts.filter(c => c.rule_type === 'SYMPTOM').slice(0, 5);
  const fields = sample.profile_schema.slice(0, 2).map(field => `<label class="profile-field"><span>${escape(field.label)}</span><select><option value="">未填写</option>${Object.entries(field.options).map(([value,label]) => `<option value="${escape(value)}">${escape(label)}</option>`).join('')}</select></label>`).join('');
  return expandable(`<span class="symptom-title"><span class="symptom-avatar">${icon('person')}</span><span>患者与症状信息<small>可选填写</small></span></span>`, `<div class="symptom-body"><div class="profile-fields">${fields}</div><h4>症状线索</h4><div class="symptom-options">${options.map(c => `<label><input type="checkbox"><span>${escape(c.source_context)}</span></label>`).join('')}</div></div>`, false, 'symptom-card');
}
function nav() {
  return `<nav class="bottom-nav" aria-label="模块样式"><button type="button" data-nav="rehab" aria-pressed="true">${icon('home')}<span>康复思路</span></button><button type="button" data-nav="postop" aria-pressed="false">${icon('clipboard')}<span>术后康复</span></button><button type="button" data-nav="library" aria-pressed="false">${icon('book')}<span>资料库</span></button><button type="button" data-nav="me" aria-pressed="false">${icon('person')}<span>我的</span></button></nav>`;
}
if (sample) {
  document.querySelector('#gallery').innerHTML = designs.map(design => `<article class="design" data-design="${design.id}"><header class="design-label"><span class="reference-number">图 ${design.id}</span><div><h2>${design.name}</h2><p>${design.desc}</p></div></header><div class="device"><div class="status-bar"><b>9:41</b><span class="status-indicators"><i></i><i></i><i></i><i></i><span class="battery"></span></span></div><div class="phone-top"><span class="top-back">${icon('back')}</span><span>康复思路</span><span class="module-tag">膝 · 右侧</span></div><div class="phone-scroll"><header class="region-header"><span class="region-caption">当前部位</span><h2>${escape(sample.result.region.name)}</h2><div class="region-footer"><span class="region-sublabel">康复思路</span><span class="header-pill">膝关节</span></div></header>${renderSymptoms()}<div class="dimension-tabs" aria-label="评估方向">${sample.result.dimensions.map((d,i) => `<button type="button" data-dimension="${escape(d.key)}" aria-pressed="${i===0}">${escape(d.label)}</button>`).join('')}</div><div class="assessment-content">${renderDimension(sample.result.dimensions[0])}</div><p class="content-end">RehabMind</p></div>${nav()}<div class="home-indicator"></div><div class="detail-layer" hidden><div class="detail-scrim"></div><section class="detail-sheet" role="dialog" aria-modal="true" aria-label="发现详情"><span class="grip"></span><header><div><span class="detail-item"></span><h3 class="detail-name"></h3></div><button class="detail-close" type="button" aria-label="关闭详情">${icon('close')}</button></header><div class="detail-content"></div></section></div></div><footer class="design-footer"><div class="swatches" aria-label="配色">${design.colors.map(color => `<span style="background:${color}" title="${color}"></span>`).join('')}</div><span>卡片展开 / 底部详情</span></footer></article>`).join('');
  document.querySelectorAll('.design').forEach(design => {
    let previousFocus;
    let closing = false;
    const layer = design.querySelector('.detail-layer');
    const close = () => {
      if (closing) return;
      const finish = () => { layer.hidden = true; layer.classList.remove('closing'); closing = false; design.querySelector('.phone-scroll').inert = false; design.querySelector('.bottom-nav').inert = false; previousFocus?.focus(); };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
      closing = true; layer.classList.add('closing'); setTimeout(finish,220);
    };
    design.addEventListener('click', event => {
      const expand = event.target.closest('.expand-head');
      if (expand) {
        const open = expand.getAttribute('aria-expanded') !== 'true';
        expand.setAttribute('aria-expanded', String(open));
        const region = expand.nextElementSibling;
        region.classList.toggle('open', open); region.inert = !open; region.setAttribute('aria-hidden',String(!open));
      }
      const tab = event.target.closest('[data-dimension]');
      if (tab) {
        design.querySelectorAll('[data-dimension]').forEach(button => button.setAttribute('aria-pressed',String(button === tab)));
        design.querySelector('.assessment-content').innerHTML = renderDimension(sample.result.dimensions.find(d => d.key === tab.dataset.dimension));
      }
      const finding = event.target.closest('[data-feature]');
      if (finding) {
        const item = sample.result.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items)).find(i=>i.possible_findings.some(f=>f.feature_id === finding.dataset.feature));
        const f = item.possible_findings.find(f=>f.feature_id === finding.dataset.feature);
        layer.querySelector('.detail-item').textContent = item.name;
        layer.querySelector('.detail-name').textContent = f.name;
        layer.querySelector('.detail-content').innerHTML = `${f.trigger_condition ? `<section class="understanding"><h4>如何理解</h4><p>${escape(f.trigger_condition)}</p></section>`:''}${f.display_note ? `<aside class="finding-note"><h4>${escape(f.display_note.label)}</h4><p>${escape(f.display_note.text)}</p></aside>`:''}${f.treatment_goals.length ? `<section class="treatments"><h4>${icon('book')}处理参考</h4>${f.treatment_goals.map(goal => `<div class="goal"><span>${escape(goal.goal)}</span><ul>${goal.methods.map(method=>`<li>${escape(method)}</li>`).join('')}</ul>${goal.progression?`<p>${escape(goal.progression)}</p>`:''}</div>`).join('')}</section>`:''}`;
        previousFocus = finding; layer.hidden = false;
        design.querySelector('.phone-scroll').inert = true; design.querySelector('.bottom-nav').inert = true;
        layer.querySelector('.detail-close').focus();
      }
      if (event.target.closest('.detail-close,.detail-scrim')) close();
      const bottom = event.target.closest('[data-nav]');
      if (bottom) {
        design.querySelectorAll('[data-nav]').forEach(button=>button.setAttribute('aria-pressed',String(button===bottom)));
      }
    });
    layer.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') { event.preventDefault(); layer.querySelector('.detail-close').focus(); }
    });
  });
}
document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click',() => {
  document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelector('#gallery').dataset.selected = button.dataset.style;
}));
