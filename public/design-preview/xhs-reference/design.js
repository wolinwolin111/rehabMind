'use strict';

const designs = {
  a: { name: '清透薄荷', subtitle: '柔光背景 · 轻透卡片 · 深色浮动导航', source: '取自参考的健康管理界面', colors: ['#e7f1ee', '#b8ded3', '#ffffff', '#255f55'], summary: '最接近参考图的清透感。薄荷柔光集中在部位卡片，内容区域保持柔白。' },
  b: { name: '云霄蓝', subtitle: '云蓝底色 · 大块白卡 · 蓝色胶囊导航', source: '结合参考的运动界面与已选配色', colors: ['#e8f1f7', '#a4cfde', '#ffffff', '#28576b'], summary: '延续你喜欢的蓝色。以蓝色部位卡建立焦点，白色列表承接具体内容。' },
  c: { name: '浅色分区', subtitle: '薄荷、浅蓝与淡珊瑚 · 模块色块', source: '取自参考的学习模块界面', colors: ['#eff4f2', '#d1e9df', '#dce8f4', '#f3ded0'], summary: '用颜色区分模块。肌肉、活动度和能力各有区域，展开后仍能认出所属模块。' },
  d: { name: '雾绿留白', subtitle: '雾绿底色 · 干净白卡 · 细边胶囊导航', source: '取自参考的生活服务界面', colors: ['#e9efe6', '#d4e2d2', '#ffffff', '#254c39'], summary: '更安静、适合长内容。用间距和卡片分区建立层次，少量深绿强调当前操作。' }
};

const paths = {
  back: '<path d="m14 6-6 6 6 6"/>', arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v11h14V9M10 20v-6h4v6"/>',
  postop: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 3h6v4H9zM12 10v7m-3-3h6"/>',
  book: '<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
  user: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  joint: '<path d="m9 3 2 6-4 4 3 8m5-18-2 6 4 4-3 8"/><circle cx="12" cy="12" r="2"/>',
  muscle: '<path d="M8 3c0 4-4 6-4 9s4 5 4 9m8-18c0 4 4 6 4 9s-4 5-4 9M8 4c5 4 5 12 0 16m8-16c-5 4-5 12 0 16"/>',
  activity: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
  knee: '<path d="M8 3l1 6-4 5 3 7m9-18 1 6-4 5 1 7M9 9c-5-1-5 6 0 6m5-1-5 1"/>',
  ankle: '<path d="M10 3v12l-5 4c-2 2 0 3 2 2l12-4c1-1 0-3-2-3l-2-1V3"/><circle cx="13" cy="14" r="2"/>',
  leg: '<path d="M7 3c-2 5 0 9 2 11l-1 7m7-18c3 4 2 7-1 11l1 7M9 14h5"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="m5 12 4 4L19 6"/>', bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.joint}</svg>`;

// These excerpts come from the existing RehabMind design preview.
const findings = [
  { title: '拉长或活动受限', text: '髋外展拉长时内侧牵拉受限或局部张力改变', goal: '改善长度与活动', methods: ['内收肌群手法松解', '内收肌拉伸', 'MET'] },
  { title: '局部敏感', text: '内收肌群触诊或相关活动时出现局部敏感反应', goal: '缓解局部不适', methods: ['调整诱发动作负荷', '低刺激主动活动'] }
];
const muscles = [
  { name: '内收肌群', why: '内收肌群的长度和局部状态可与大腿内侧及膝内侧牵扯感对照。', focus: '比较内收肌群拉长、局部反应与侧差。' },
  { name: '缝匠肌', why: '缝匠肌参与鹅足区；其长度和局部状态可与膝内下方不适对照。' },
  { name: '半膜肌', why: '半膜肌位于腘绳肌后内侧深层；拉长和局部反应可与膝后内侧不适对照。' }
];

function anatomy() {
  return `<svg class="anatomy-art" viewBox="0 0 230 280" role="img" aria-label="下肢部位示意，标记膝内侧">
    <path class="body-shadow" d="M61 18c-8 31-2 63 9 91l12 34-10 84-10 23c-5 8-1 12 8 11l20-7 10-29 7-73 6-27 8 30 9 72 12 28 17 8c9 2 13-4 7-12l-11-22-9-84 12-35c12-28 15-59 9-88Z"/>
    <path class="body-fill" d="M60 13c-7 26-3 54 7 81l15 40c-5 14-8 28-8 43l-1 45-12 24c-4 7-1 11 7 10l18-6 13-28 6-67c2-14 5-23 8-31l9 30 8 68 12 28 17 6c9 2 11-4 7-11l-12-23-3-47c-1-14-4-28-8-41l14-40c10-27 13-54 8-81Z"/>
    <path class="anatomy-line" d="m111 17 2 67m-33-57c-5 30 4 47 14 69l-2 24m53-93c4 29-4 48-15 69l4 24M92 150l-4 63m47-63 5 63M78 132q12-9 22 1m25 0q12-8 21 1"/>
    <path class="muscle-fill" d="M95 28c-4 26 4 51 11 71l7-15V35Z"/>
    <path class="muscle-fill" d="M132 29c4 24-4 49-10 69l-9-14V35Z"/>
    <circle class="joint-ring" cx="134" cy="136" r="18"/><circle class="joint-dot" cx="127" cy="134" r="5"/>
    <path class="leader-line" d="M150 133h22l11-12"/><circle class="leader-dot" cx="183" cy="121" r="3"/>
  </svg>`;
}

function status() {
  return `<div class="status-bar"><b>9:41</b><span class="device-status"><svg viewBox="0 0 40 15" aria-hidden="true"><path d="M1 12v-2m4 2V7m4 5V4m4 8V1" stroke="currentColor" stroke-width="2.4"/><path d="M19 4q6-5 12 0m-10 3q4-3 8 0m-6 3q2-2 4 0" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="25" cy="12" r="1"/></svg><span class="battery"></span></span></div>`;
}

function nav(selected = 'home') {
  return `<nav class="app-dock" aria-label="应用导航">${[['home', '康复思路'], ['postop', '术后康复'], ['book', '资料库'], ['user', '我的']].map(([id, label]) => `<button type="button" data-nav="${id}" class="${id === selected ? 'active' : ''}" ${id === selected ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></button>`).join('')}</nav>`;
}

function modules(selected = '膝') {
  return `<div class="module-tabs" role="group" aria-label="部位"><button data-module="膝" aria-pressed="${selected === '膝'}">膝</button><button data-module="踝足" aria-pressed="${selected === '踝足'}">踝足</button><button data-module="小腿" aria-pressed="${selected === '小腿'}">小腿</button><button data-module="大腿" aria-pressed="${selected === '大腿'}">大腿</button></div>`;
}

function home(design) {
  const model = `<section class="model-card"><div class="model-meta"><span>不适部位</span><span class="model-side">右侧</span></div>${anatomy()}<button class="region-hotspot" data-action="reasoning">膝内侧 ${icon('right')}</button><div class="view-switch" role="group" aria-label="模型视角"><button aria-pressed="true" data-view="front">正面</button><button aria-pressed="false" data-view="side">侧面</button><button aria-pressed="false" data-view="back">背面</button></div></section>`;
  const grid = `<div class="body-modules">${[['knee', '膝', '膝内侧'], ['ankle', '踝足', '踝与足部'], ['leg', '小腿', '小腿区域'], ['muscle', '大腿', '大腿区域']].map(([id, name, label]) => `<button class="body-module module-${id}" data-choose-region="${name}"><span class="module-icon">${icon(id)}</span><span class="module-corner">${icon('right')}</span><strong>${name}</strong><small>${label}</small></button>`).join('')}</div>`;
  let content;
  if (design === 'c') {
    content = `<h1 class="page-heading">选择不适部位</h1>${grid}<div class="section-title"><h2>部位定位</h2><span>右侧</span></div><section class="compact-model">${anatomy()}<div><span class="selected-region">膝内侧</span><button class="text-action" data-action="reasoning">查看康复思路 ${icon('arrow')}</button></div></section>`;
  } else if (design === 'b') {
    content = `<h1 class="page-heading">康复思路</h1>${modules()}<section class="blue-feature"><div><span class="feature-label">部位定位</span><h2>找到你的<br>不适部位</h2><button class="round-button" data-action="reasoning" aria-label="查看膝内侧康复思路">${icon('arrow')}</button></div>${anatomy()}<button class="blue-region" data-action="reasoning">膝内侧 ${icon('right')}</button></section><div class="selected-row"><span class="small-symbol">${icon('target')}</span><div><small>当前部位</small><strong class="selected-region">右侧 · 膝内侧</strong></div><button class="round-button" data-action="reasoning" aria-label="查看康复思路">${icon('arrow')}</button></div>`;
  } else {
    content = `<h1 class="page-heading">${design === 'd' ? '从部位开始' : '康复思路'}</h1>${modules()}${model}<button class="primary-button" data-action="reasoning"><span>查看康复思路</span>${icon('arrow')}</button>`;
  }
  return `<div class="app-top"><span class="app-wordmark"><i class="brand-glyph">R</i> RehabMind</span><button class="round-button" data-action="library" aria-label="打开资料库">${icon('book')}</button></div>${content}<div class="section-title secondary-title"><h2>继续查看</h2></div><button class="resume-item" data-action="reasoning"><span class="small-symbol">${icon('knee')}</span><span><strong>膝内侧</strong><small>肌肉状态 · 内收肌群</small></span><span class="resume-arrow">${icon('right')}</span></button>`;
}

function expansion(id, header, body, open = false, extra = '') {
  return `<section class="expandable ${extra} ${open ? 'is-open' : ''}"><button class="expand-head" aria-expanded="${open}" aria-controls="${id}">${header}<span class="chevron">${icon('down')}</span></button><div class="expansion" id="${id}" ${open ? '' : 'inert aria-hidden="true"'}><div class="expansion-clip">${body}</div></div></section>`;
}

function symptomCard(uid) {
  return expansion(`${uid}-symptoms`, `<span class="head-label"><span class="small-symbol">${icon('user')}</span><strong>患者与症状信息</strong></span>`, `<div class="symptom-body"><div class="patient-fields"><label>年龄<select><option>未填写</option><option>18–35 岁</option><option>36–60 岁</option><option>60 岁以上</option></select></label><label>侧别<select><option>右侧</option><option>左侧</option></select></label></div><h4>动作线索</h4><div class="choice-chips"><button aria-pressed="false">上下楼</button><button aria-pressed="false">下蹲</button><button aria-pressed="false">步行</button></div><h4>症状线索</h4><div class="choice-chips"><button aria-pressed="false">局部不适</button><button aria-pressed="false">牵拉感</button><button aria-pressed="false">活动受限</button></div></div>`, false, 'symptom-card');
}

function muscleCard(item, index, uid, open = false) {
  const body = `<div class="assessment-body"><section class="why-block"><h4>为什么看</h4><p>${item.why}</p></section>${item.focus ? `<section class="focus-block"><h4>检查重点</h4><p>${item.focus}</p></section><section class="findings-block"><h4>可能发现</h4>${findings.map((f, i) => `<button class="finding-button" data-finding="${i}"><span>${f.title}</span><span class="finding-arrow">${icon('right')}</span></button>`).join('')}</section>` : ''}</div>`;
  return expansion(`${uid}-muscle-${index}`, `<span class="head-label"><span class="card-symbol">${icon('muscle')}</span><strong>${item.name}</strong></span>`, body, open, 'assessment-card');
}

function reasoning(design, uid) {
  return `<div class="app-top reasoning-top"><button class="round-button" data-action="home" aria-label="返回部位选择">${icon('back')}</button><span>康复思路</span><button class="round-button" data-action="home" aria-label="重新选择部位">${icon('target')}</button></div><header class="region-heading"><h1>膝内侧</h1><span class="side-tag">右侧 · 膝</span></header>${symptomCard(uid)}<div class="direction-tabs" role="tablist" aria-label="评估方向"><button role="tab" aria-selected="true" data-direction="muscle">${icon('muscle')}<span>肌肉状态</span></button><button role="tab" aria-selected="false" data-direction="joint">${icon('joint')}<span>活动度</span></button><button role="tab" aria-selected="false" data-direction="ability">${icon('activity')}<span>能力表现</span></button></div><div class="direction-content" data-active-direction="muscle"><div class="section-title group-title"><h2>膝内侧相关肌群</h2><span>3 项</span></div>${muscleCard(muscles[0], 0, uid, true)}${muscleCard(muscles[1], 1, uid)}<div class="related-module"><div class="section-title"><h2>其他相关项目</h2><span>1 项</span></div>${muscleCard(muscles[2], 2, uid)}</div></div>`;
}

function treatmentContent(finding = findings[0]) {
  return `<div class="interpretation"><h4>如何理解</h4><p>${finding.text}</p></div><section class="treatment-block"><div class="section-title"><h4>处理参考</h4><span class="small-symbol">${icon('book')}</span></div><h3>${finding.goal}</h3><ul class="method-list">${finding.methods.map(m => `<li><span class="method-check">${icon('check')}</span>${m}</li>`).join('')}</ul></section>`;
}

function treatmentPage(design, uid) {
  return `<div class="app-top reasoning-top"><button class="round-button" data-action="reasoning" aria-label="返回康复思路">${icon('back')}</button><span>处理参考</span><span class="top-spacer"></span></div><header class="region-heading"><h1>膝内侧</h1><span class="side-tag">右侧 · 膝</span></header><div class="treatment-context"><span class="card-symbol">${icon('muscle')}</span><strong>内收肌群</strong></div><section class="treatment-preview"><div class="sheet-grip"></div><span class="drawer-eyebrow">内收肌群</span><h2>${findings[0].title}</h2>${treatmentContent()}</section><div class="section-title secondary-title"><h2>其他发现</h2></div><button class="finding-button standalone-finding" data-finding="1"><span>局部敏感</span>${icon('right')}</button>`;
}

function auxiliaryPage(page) {
  const pages = {
    postop: { title: '术后康复', glyph: 'postop', labels: ['膝关节', '踝与足部', '髋关节'] },
    book: { title: '资料库', glyph: 'book', labels: ['评估资料', '解剖资料', '运动康复'] },
    user: { title: '我的', glyph: 'user', labels: ['最近查看', '我的收藏', '显示设置'] }
  };
  const item = pages[page];
  return `<div class="app-top"><span class="app-wordmark"><i class="brand-glyph">R</i> RehabMind</span><button class="round-button" data-action="home" aria-label="返回康复思路">${icon('home')}</button></div><h1 class="page-heading">${item.title}</h1><div class="aux-feature"><span class="card-symbol">${icon(item.glyph)}</span><strong>${item.title}</strong></div><div class="aux-list">${item.labels.map((label, i) => `<button class="aux-row" aria-expanded="false"><span>${label}</span>${icon('right')}</button>`).join('')}</div>`;
}

let phoneCount = 0;
function phone(design, screen = 'home') {
  const uid = `preview-${++phoneCount}`;
  return `<div class="phone theme-${design}" data-design="${design}" data-phone-id="${uid}" data-screen="${screen}">${status()}<div class="app-scroll"><div class="screen-content">${screen === 'reasoning' ? reasoning(design, uid) : screen === 'treatment' ? treatmentPage(design, uid) : home(design)}</div></div>${nav()}<div class="home-indicator"></div><div class="drawer-layer" hidden></div></div>`;
}

const gallery = document.querySelector('#gallery');
const selectedDesign = document.body.dataset.design;
if (selectedDesign === 'all') {
  gallery.innerHTML = Object.entries(designs).map(([id, design]) => `<article class="design-option"><header class="option-heading"><span class="option-letter">${id.toUpperCase()}</span><div><h2>${design.name}</h2><span>${design.subtitle}</span></div><a href="./${id}.html" aria-label="放大查看${design.name}">↗</a></header>${phone(id)}<footer class="option-foot"><div class="swatches">${design.colors.map(c => `<span style="background:${c}" title="${c}"></span>`).join('')}</div><a href="./${id}.html">展开看这一版 ${icon('arrow')}</a><p>${design.summary}</p></footer></article>`).join('');
} else if (designs[selectedDesign]) {
  const config = designs[selectedDesign];
  document.querySelector('#design-title').textContent = `${selectedDesign.toUpperCase()} · ${config.name}`;
  document.querySelector('#design-description').textContent = `${config.subtitle}。${config.summary}`;
  gallery.innerHTML = [['home', '首页'], ['reasoning', '康复思路'], ['treatment', '处理参考']].map(([screen, name]) => `<article class="design-option"><header class="individual-screen-title">${name}</header>${phone(selectedDesign, screen)}</article>`).join('');
  document.querySelectorAll('.design-switcher a').forEach(link => { if (link.dataset.design === selectedDesign) link.setAttribute('aria-current', 'page'); });
}

function changeScreen(container, screen) {
  const design = container.dataset.design;
  const uid = container.dataset.phoneId;
  closeDrawer(container, true);
  container.dataset.screen = screen;
  const content = container.querySelector('.screen-content');
  content.innerHTML = screen === 'home' ? home(design) : screen === 'reasoning' ? reasoning(design, uid) : screen === 'treatment' ? treatmentPage(design, uid) : auxiliaryPage(screen);
  content.classList.remove('screen-enter');
  void content.offsetWidth;
  content.classList.add('screen-enter');
  container.querySelector('.app-scroll').scrollTop = 0;
  container.querySelector('.app-dock').outerHTML = nav(['book', 'postop', 'user'].includes(screen) ? screen : 'home');
}

function openDrawer(container, index, trigger) {
  const f = findings[index];
  const layer = container.querySelector('.drawer-layer');
  if (layer.closeTimer) { clearTimeout(layer.closeTimer); layer.closeTimer = null; }
  layer.returnFocus = trigger;
  layer.hidden = false;
  layer.classList.remove('closing');
  layer.innerHTML = `<button class="scrim" aria-label="关闭处理参考"></button><section class="finding-drawer" role="dialog" aria-modal="true" aria-labelledby="${container.dataset.phoneId}-finding-title"><div class="sheet-grip"></div><header class="drawer-header"><div><span class="drawer-eyebrow">内收肌群</span><h2 id="${container.dataset.phoneId}-finding-title">${f.title}</h2></div><button class="round-button drawer-close" aria-label="关闭处理参考">${icon('close')}</button></header><div class="drawer-scroll">${treatmentContent(f)}</div></section>`;
  container.querySelector('.app-scroll').inert = true;
  container.querySelector('.app-dock').inert = true;
  layer.querySelector('.drawer-close').focus({ preventScroll: true });
}

function closeDrawer(container, immediate = false) {
  const layer = container.querySelector('.drawer-layer');
  if (!layer || layer.hidden) return;
  if (layer.closeTimer) { if (!immediate) return; clearTimeout(layer.closeTimer); }
  const finish = () => {
    layer.hidden = true;
    layer.classList.remove('closing');
    layer.closeTimer = null;
    container.querySelector('.app-scroll').inert = false;
    container.querySelector('.app-dock').inert = false;
    if (!immediate && layer.returnFocus?.isConnected) layer.returnFocus.focus({ preventScroll: true });
  };
  if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
  layer.classList.add('closing');
  layer.closeTimer = setTimeout(finish, 240);
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.screen) {
    document.querySelectorAll('.screen-picker button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('.phone').forEach(container => changeScreen(container, button.dataset.screen));
    return;
  }
  const container = button.closest('.phone');
  if (!container) return;
  if (button.classList.contains('drawer-close') || button.classList.contains('scrim')) return closeDrawer(container);
  if (button.dataset.action) return changeScreen(container, button.dataset.action === 'library' ? 'book' : button.dataset.action);
  if (button.dataset.nav) return changeScreen(container, button.dataset.nav);
  if (button.classList.contains('expand-head')) {
    const card = button.closest('.expandable');
    const open = !card.classList.contains('is-open');
    card.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    const body = card.querySelector('.expansion');
    body.inert = !open;
    body.setAttribute('aria-hidden', String(!open));
    return;
  }
  if (button.hasAttribute('data-finding')) return openDrawer(container, Number(button.dataset.finding), button);
  if (button.closest('.choice-chips')) button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  if (button.dataset.module || button.dataset.chooseRegion) {
    const region = button.dataset.module || button.dataset.chooseRegion;
    const regionMap = { '膝': '膝内侧', '踝足': '踝与足部', '小腿': '小腿区域', '大腿': '大腿区域' };
    container.querySelectorAll('[data-module]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.module === region)));
    container.querySelectorAll('[data-choose-region]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    container.querySelectorAll('.selected-region').forEach(el => { el.textContent = regionMap[region]; });
    container.querySelectorAll('.region-hotspot,.blue-region').forEach(el => { el.innerHTML = `${regionMap[region]} ${icon('right')}`; });
    container.querySelectorAll('.anatomy-art').forEach(el => { el.dataset.region = region; });
  }
  if (button.dataset.view) {
    container.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    container.querySelector('.anatomy-art').dataset.view = button.dataset.view;
  }
  if (button.dataset.direction) {
    container.querySelectorAll('[data-direction]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
    const content = container.querySelector('.direction-content');
    const uid = container.dataset.phoneId;
    if (button.dataset.direction === 'muscle') content.innerHTML = `<div class="section-title group-title"><h2>膝内侧相关肌群</h2><span>3 项</span></div>${muscleCard(muscles[0], 0, uid, true)}${muscleCard(muscles[1], 1, uid)}<div class="related-module"><div class="section-title"><h2>其他相关项目</h2><span>1 项</span></div>${muscleCard(muscles[2], 2, uid)}</div>`;
    else {
      const labels = button.dataset.direction === 'joint' ? ['膝关节', '髋关节', '踝关节'] : ['步行', '下蹲', '上下楼'];
      content.innerHTML = `<div class="section-title group-title"><h2>${button.dataset.direction === 'joint' ? '相关关节' : '动作表现'}</h2></div><div class="preview-module-list">${labels.map(label => `<div class="preview-module-row"><span class="card-symbol">${icon(button.dataset.direction === 'joint' ? 'joint' : 'activity')}</span><strong>${label}</strong></div>`).join('')}</div>`;
    }
    content.dataset.activeDirection = button.dataset.direction;
    content.classList.remove('screen-enter'); void content.offsetWidth; content.classList.add('screen-enter');
  }
  if (button.classList.contains('aux-row')) {
    const selected = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!selected));
    if (selected) button.nextElementSibling?.remove();
    else button.insertAdjacentHTML('afterend', '<div class="aux-empty">暂无记录</div>');
  }
});

document.addEventListener('keydown', event => {
  const container = event.target.closest('.phone');
  if (!container) return;
  const layer = container.querySelector('.drawer-layer');
  if (event.key === 'Escape' && !layer.hidden) { event.preventDefault(); closeDrawer(container); }
  if (event.key === 'Tab' && !layer.hidden) {
    const close = layer.querySelector('.drawer-close');
    event.preventDefault(); close.focus();
  }
  const tab = event.target.closest('[role="tab"]');
  if (tab && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  }
});
