export const roles = [
  ['nav', '顶部 / 底部导航', '#90AFDE', '导航'],
  ['navActive', '导航选中底色', '#FBF7EF', '导航'],
  ['page', '页面与卡片展开区', '#FBF7EF', '底色'],
  ['model', '模型背景', '#FBF7EF', '底色'],
  ['entry', '查看思路入口', '#F5D9C7', '入口'],
  ['entryButton', '查看思路按钮', '#FFF5E9', '入口'],
  ['atlasEntry', '肌肉图谱侧边入口', '#90AFDE', '入口'],
  ['mode', '选择部位 / 调整视角未选中', '#FBF7EF', '模型按钮'],
  ['modeActive', '选择部位 / 调整视角选中', '#D4EEE1', '模型按钮'],
  ['atlasHeader', '肌肉图谱顶部', '#90AFDE', '肌肉图谱'],
  ['atlasBar', '肌肉名称横条', '#90AFDE', '肌肉图谱'],
  ['atlasPeel', '加减层控制栏', '#DCE8F7', '肌肉图谱'],
  ['atlasButton', '加减层 / 单独显示按钮', '#F8FBFF', '肌肉图谱'],
  ['atlasButtonActive', '单独显示选中', '#D6F0DF', '肌肉图谱'],
  ['atlasModel', '图谱模型背景', '#FFFFFF', '肌肉图谱'],
  ['atlasDetail', '图谱解剖说明背景', '#FFFFFF', '肌肉图谱'],
  ['sheetHeader', '思路弹窗顶部', '#E8EDF8', '思路弹窗'],
  ['closeButton', '弹窗关闭 / 返回按钮', '#FBF7EF', '思路弹窗'],
  ['direction', '方向切换未选中', '#FBF7EF', '思路弹窗'],
  ['directionActive', '方向切换选中', '#D4EEE1', '思路弹窗'],
  ['action', '查看相关活动 / 返回部位按钮', '#E8EDF8', '思路弹窗'],
  ['tissue', '周围组织卡片', '#ECEEE1', '内容'],
  ['consultation', '问诊卡片', '#EAE4F5', '内容'],
  ['patient', '患者信息卡片', '#D4EEE1', '内容'],
  ['assessment', '评估项目卡片', '#E8EDF8', '内容'],
  ['treatment', '处理参考卡片', '#F7E6BE', '内容'],
  ['ink', '正文文字', '#233E50', '文字'],
];
export const defaults = Object.fromEntries(roles.map(([key, , value]) => [key, value]));
// Keep the user's saved v1 schemes. Missing new controls inherit their former colour.
const legacyKeys = new Set(['nav','navActive','page','model','entry','entryButton','tissue','consultation','patient','assessment','treatment','ink']);
const legacyFallback = {atlasEntry:'nav',mode:'page',modeActive:'patient',atlasHeader:'nav',atlasBar:'nav',sheetHeader:'assessment',direction:'page',directionActive:'patient',action:'assessment'};
export const presets = [
  { name: '当前 · 雾蓝马卡龙', colors: defaults },
  { name: '图 1 · 蓝与浅黄', colors: { ...defaults, nav: '#79C4E3', entry: '#FCFDC1', patient: '#DFF2FA', consultation: '#EAF8F8', treatment: '#FCFDC1' } },
  { name: '图 2 · 青与柔粉', colors: { ...defaults, nav: '#18AFC0', page: '#EAF8F8', model: '#EAF8F8', entry: '#DDA2B4', consultation: '#F4DCE4', patient: '#EAF8F8' } },
  { name: '图 3 · 蓝与柔紫', colors: { ...defaults, nav: '#3E67C7', page: '#EAF3FB', model: '#EAF3FB', entry: '#B49BCF', consultation: '#E5DAF1', assessment: '#D8E6FA' } },
  { name: '图 8 · 雾蓝杏黄浅青', colors: { ...defaults, nav: '#90AFDE', entry: '#EDC98C', consultation: '#EAF8F8', patient: '#9FD9D9', tissue: '#ECEEE1' } },
];
export const referenceColors = [
  ['雾蓝', '#90AFDE'], ['浅雾蓝', '#88ABDA'], ['晴蓝', '#79C4E3'], ['湖蓝', '#0D62AD'],
  ['青蓝', '#35C2EE'], ['蓝紫', '#3E67C7'], ['柔紫', '#B49BCF'], ['青绿', '#18AFC0'],
  ['柔粉', '#DDA2B4'], ['浅青', '#9FD9D9'], ['浅青白', '#EAF8F8'], ['浅豆霜', '#ECEEE1'],
  ['淡翠绿', '#CDEDDE'], ['瓦松绿', '#6F9986'], ['杏黄', '#EDC98C'], ['浅黄', '#FCFDC1'],
  ['米杏白', '#FBF7EF'], ['柔杏桃', '#F5D9C7'], ['淡紫', '#EAE4F5'], ['纯白', '#FFFFFF'],
];
export function hex(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const match = /^#?([\da-f]{6}|[\da-f]{3})$/i.exec(text);
  return match ? '#' + (match[1].length === 3 ? [...match[1]].map(x => x + x).join('') : match[1]).toUpperCase() : null;
}
export function validatePalette(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('配色文件格式不正确。');
  const result = {};
  for (const [key, label] of roles) {
    const value = hex(input[key] === undefined && !legacyKeys.has(key) ? input[legacyFallback[key]] || defaults[key] : input[key]);
    if (!value) throw new Error(`“${label}”缺少有效色号，请使用 #RRGGBB 格式。`);
    result[key] = value;
  }
  return result;
}
function luminance(color) {
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function readable(background, preferred = defaults.ink) {
  return contrast(background, preferred) >= 4.5 ? preferred : contrast(background, '#FFFFFF') > contrast(background, '#000000') ? '#FFFFFF' : '#000000';
}
export function themeCss(c) {
  c = validatePalette(c);
  const navInk = readable(c.nav, c.ink), entryInk = readable(c.entry, c.ink);
  return `/* RehabMind 自由配色 */
:root {
  --header-blue: ${c.nav}; --palette-mist: ${c.nav}; --header-line: ${c.nav};
  --palette-cream: ${c.navActive};
  --paper: ${c.page}; --page: ${c.page}; --surface: ${c.page}; --model-background: ${c.model};
  --ink: ${c.ink}; --muted: ${c.ink}; --teal: ${c.ink}; --teal-deep: ${c.ink};
  --blue-wash: ${c.assessment}; --card-head: ${c.assessment}; --card-ink: ${readable(c.assessment, c.ink)};
  --tissue-wash: ${c.tissue}; --consultation-wash: ${c.consultation}; --consultation-ink: ${readable(c.consultation, c.ink)};
  --context-wash: ${c.patient}; --mint: ${c.patient}; --selection: ${c.patient}; --selection-ink: ${readable(c.patient, c.ink)};
  --green-ink: ${readable(c.patient, c.ink)}; --green-soft: ${c.page};
  --treatment-wash: ${c.treatment}; --treatment-ink: ${readable(c.treatment, c.ink)};
  --resume-wash: ${c.entry}; --resume-line: ${c.entry}; --resume-ink: ${entryInk}; --resume-action: ${c.entryButton};
}
.app-header, .app-header .brand small, .app-header .brand strong, .bottom-nav button { color: ${navInk}; }
.bottom-nav button.is-active { color: ${readable(c.navActive, c.ink)}; }
.resume-card__action { color: ${readable(c.entryButton, c.ink)}; }
.tissue-panel__head { color: ${readable(c.tissue, c.ink)}; }
.context-panel__head { color: ${readable(c.patient, c.ink)}; }
.muscle-explorer-tab, .muscle-explorer-tab:hover { background: ${c.atlasEntry}; color: ${readable(c.atlasEntry,c.ink)}; border-color: ${c.atlasEntry}; }
.anatomy-mode { background: ${c.mode}; }
.anatomy-mode button { background: ${c.mode}; color: ${readable(c.mode,c.ink)}; }
.anatomy-mode button.active { background: ${c.modeActive}; color: ${readable(c.modeActive,c.ink)}; }
.reasoning-sheet__header { background: ${c.sheetHeader}; color: ${readable(c.sheetHeader,c.ink)}; }
.reasoning-sheet__header .sheet-overline, .reasoning-sheet__top h2 { color: ${readable(c.sheetHeader,c.ink)}; }
.reasoning-sheet__top small { background: ${c.closeButton}; color: ${readable(c.closeButton,c.ink)}; }
.reasoning-sheet__top > button, .finding-drawer > header button, .muscle-explorer__header button { background: ${c.closeButton}; color: ${readable(c.closeButton,c.ink)}; }
.direction-tabs button { background: ${c.direction}; color: ${readable(c.direction,c.ink)}; }
.direction-tabs button[aria-pressed="true"] { background: ${c.directionActive}; color: ${readable(c.directionActive,c.ink)}; }
.finding-location-review button, .direction-empty button, .module-empty button { background: ${c.action}; color: ${readable(c.action,c.ink)}; }
.muscle-explorer { --surface: ${c.atlasDetail}; --model-background: ${c.atlasModel}; --green-ink: ${readable(c.atlasHeader,c.ink)}; }
.muscle-explorer__header { background: ${c.atlasHeader}; }
.muscle-explorer__header h2, .muscle-explorer__header p { color: ${readable(c.atlasHeader,c.ink)}; }
.muscle-explorer .muscle-selection { background: ${c.atlasBar}; color: ${readable(c.atlasBar,c.ink)}; }
.muscle-explorer .muscle-selection small { color: ${readable(c.atlasBar,c.ink)}; }
.muscle-peel { background: ${c.atlasPeel}; color: ${readable(c.atlasPeel,c.ink)}; }
.muscle-peel span { color: ${readable(c.atlasPeel,c.ink)}; }
.muscle-peel button, .muscle-solo-button { background: ${c.atlasButton}; color: ${readable(c.atlasButton,c.ink)}; }
.muscle-solo-button[aria-pressed="true"] { background: ${c.atlasButtonActive}; color: ${readable(c.atlasButtonActive,c.ink)}; }
.muscle-anatomy { background: ${c.atlasDetail}; color: ${readable(c.atlasDetail,c.ink)}; }
`;
}
