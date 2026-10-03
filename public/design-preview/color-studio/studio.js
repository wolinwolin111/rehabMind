import { roles, defaults, presets, referenceColors, hex, validatePalette, themeCss, readable, contrast } from './palette.js';
const $ = selector => document.querySelector(selector);
const STORAGE = 'rehabmind-color-studio-v1';
let colors = { ...defaults }, saved = [], noticeTimer;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE));
  if (stored?.current) colors = validatePalette(stored.current);
  if (Array.isArray(stored?.saved)) saved = stored.saved.slice(0, 50).flatMap(scheme => {
    try { return [{ name: String(scheme.name || '未命名方案').slice(0, 40), colors: validatePalette(scheme.colors) }]; } catch { return []; }
  });
} catch { /* A fresh palette remains usable when storage is unavailable or corrupt. */ }
function notice(text) {
  $('#status').textContent = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('#status').textContent = ''; }, 4500);
}
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify({ current: colors, saved })); }
  catch { notice('浏览器无法保存，请导出配色文件保留这组颜色。'); }
}
let previousGroup;
for (const [key, name, , group] of roles) {
  if (previousGroup !== group) {
    const heading = document.createElement('p'); heading.className = 'editor-group'; heading.textContent = group;
    $('#editors').append(heading); previousGroup = group;
  }
  const row = document.createElement('div'); row.className = 'color-row';
  row.innerHTML = `<label for="hex-${key}">${name}</label><input type="color" id="color-${key}" aria-label="${name}取色器"><input class="hex" id="hex-${key}" aria-label="${name}色号" maxlength="7" spellcheck="false">`;
  row.querySelector('[type=color]').addEventListener('input', event => setColor(key, event.target.value));
  const text = row.querySelector('.hex');
  text.addEventListener('input', () => {
    const value = hex(text.value);
    text.setAttribute('aria-invalid', String(!value));
    if (value) setColor(key, value, text);
  });
  text.addEventListener('blur', () => {
    if (!hex(text.value)) notice('请输入 3 位或 6 位十六进制色号，例如 #90AFDE。');
    text.value = colors[key]; text.removeAttribute('aria-invalid');
  });
  $('#editors').append(row);
  const option = document.createElement('option'); option.value = key; option.textContent = name; $('#target').append(option);
}
function setColor(key, value, editing) { colors[key] = hex(value); sync(editing); persist(); }
for (const preset of presets) {
  const button = document.createElement('button'); button.className = 'preset'; button.type = 'button';
  button.innerHTML = `<span>${preset.name}</span><span class="preset-colors" aria-hidden="true">${['nav','entry','consultation','patient','page'].map(key => `<i style="background:${preset.colors[key]}"></i>`).join('')}</span>`;
  button.addEventListener('click', () => { colors = { ...preset.colors }; sync(); persist(); });
  $('#presets').append(button);
}
for (const [name, value] of referenceColors) {
  const button = document.createElement('button'); button.className = 'swatch'; button.title = `${name} ${value}`; button.setAttribute('aria-label', `使用${name} ${value}`);
  button.innerHTML = `<i style="background:${value}" aria-hidden="true"></i>${name}`;
  button.addEventListener('click', () => setColor($('#target').value, value)); $('#swatch-bank').append(button);
}
const frame = $('#app-preview');
for (const group of document.querySelectorAll('.sample-mode,.sample-directions')) {
  group.addEventListener('click', event => {
    if (event.target.tagName !== 'BUTTON') return;
    for (const button of group.children) { const active=button===event.target; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active)); }
  });
}
$('.sample-solo').addEventListener('click', event => {
  const active=event.target.getAttribute('aria-pressed')!=='true'; event.target.setAttribute('aria-pressed',String(active)); event.target.textContent=active?'恢复显示':'单独显示';
});
function applyFrame() {
  try {
    const doc = frame.contentDocument;
    if (!doc?.head) return;
    let style = doc.getElementById('color-studio-override');
    if (!style) { style = doc.createElement('style'); style.id = 'color-studio-override'; doc.head.append(style); }
    style.textContent = themeCss(colors);
    frame.contentWindow.dispatchEvent(new Event('rehabmind:themechange'));
  } catch { notice('预览无法更新，请重新载入预览。'); }
}
function sync(editing) {
  for (const [key] of roles) {
    $(`#color-${key}`).value = colors[key];
    if ($(`#hex-${key}`) !== editing) { $(`#hex-${key}`).value = colors[key]; $(`#hex-${key}`).removeAttribute('aria-invalid'); }
    $('#samples').style.setProperty(`--s-${key}`, colors[key]);
    $('#samples').style.setProperty(`--s-${key}-ink`, readable(colors[key], colors.ink));
  }
  [...$('#presets').children].forEach((button, i) => button.setAttribute('aria-pressed', String(roles.every(([key]) => colors[key] === presets[i].colors[key]))));
  const ratio = contrast(colors.ink, colors.page);
  $('#contrast').textContent = `正文与底色对比度 ${ratio.toFixed(1)} : 1${ratio < 4.5 ? ' · 阅读对比偏低，建议加深文字或调浅底色。' : ' · 适合正文阅读。'} 导航及卡片标题的文字会自动适配深浅。`;
  applyFrame();
}
function renderSaved() {
  $('#saved').replaceChildren();
  if (!saved.length) { const p = document.createElement('p'); p.textContent = '喜欢一组颜色时，先保存，继续试下一组。'; $('#saved').append(p); }
  saved.forEach((scheme, index) => {
    const row = document.createElement('div'); row.className = 'saved-scheme';
    const load = document.createElement('button'); load.textContent = scheme.name; load.setAttribute('aria-label', `加载方案 ${scheme.name}`);
    load.addEventListener('click', () => { colors = { ...scheme.colors }; sync(); persist(); notice(`已加载“${scheme.name}”。`); });
    const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `移除方案 ${scheme.name}`);
    remove.addEventListener('click', () => { saved.splice(index, 1); renderSaved(); persist(); });
    row.append(load, remove); $('#saved').append(row);
  });
}
$('#save').addEventListener('click', () => {
  if (saved.length >= 50) { notice('已保存 50 组方案，请导出或移除不需要的方案。'); return; }
  const name = $('#scheme-name').value.trim() || `我的搭配 ${saved.length + 1}`;
  saved.push({ name, colors: { ...colors } }); renderSaved(); persist(); notice(`已保存“${name}”。`);
});
$('#reset').addEventListener('click', () => { colors = { ...defaults }; sync(); persist(); notice('已恢复应用当前配色。'); });
$('#reload').addEventListener('click', () => { frame.src = new URL('../../../', location.href).href; });
$('#export').addEventListener('click', () => {
  const data = { version: 2, name: $('#scheme-name').value.trim() || 'RehabMind 自由配色', colors, css: themeCss(colors) };
  $('#export-dialog textarea').value = JSON.stringify(data, null, 2);
  $('#export-dialog').showModal();
});
$('#download-json').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([$('#export-dialog textarea').value], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'rehabmind-palette.json';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#copy-json').addEventListener('click', async () => {
  const text = $('#export-dialog textarea');
  try { await navigator.clipboard.writeText(text.value); $('#export-dialog').close(); notice('配色内容已复制，可以直接发给我。'); }
  catch { text.focus(); text.select(); notice('请手动复制已选中的配色内容。'); }
});
$('#close-export').addEventListener('click', () => $('#export-dialog').close());
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 100000) throw new Error('文件过大，请选择导出的配色 JSON 文件。');
    const data = JSON.parse(await file.text()); colors = validatePalette(data.colors || data);
    $('#scheme-name').value = typeof data.name === 'string' ? data.name.slice(0, 40) : '';
    sync(); persist(); notice('已导入配色。');
  } catch (error) { notice(error instanceof SyntaxError ? '文件不是有效的 JSON，请选择导出的配色文件。' : error.message); }
  event.target.value = '';
});
$('#copy').addEventListener('click', async () => {
  const css = themeCss(colors);
  try { await navigator.clipboard.writeText(css); notice('配色样式已复制。'); }
  catch { $('#copy-dialog textarea').value = css; $('#copy-dialog').showModal(); $('#copy-dialog textarea').select(); }
});
$('#close-copy').addEventListener('click', () => $('#copy-dialog').close());
frame.addEventListener('load', applyFrame);
sync(); renderSaved();
frame.src = new URL('../../../', location.href).href;
