import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AnatomyStage } from './AnatomyStage';
import { MuscleExplorer } from './MuscleExplorer';
import { ConsultationGuide } from './ConsultationGuide';
import { RelatedTissues } from './RelatedTissues';
import { PostoperativeLibrary } from './PostoperativeLibrary';
import type { AssessmentItem, ContextRule, Dimension, Metadata, ResolveResult } from './types';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || (Capacitor.isNativePlatform() ? 'https://66.154.101.204/RehabMind' : '');
const CONTEXT_GROUPS: { type: ContextRule['public_group']; label: string }[] = [
  { type: 'ACTIVITY', label: '相关活动' }, { type: 'TIMING', label: '不适出现时机' },
  { type: 'SYMPTOM', label: '伴随表现' }, { type: 'ASSOCIATED', label: '相关部位' }, { type: 'RISK', label: '需要留意的情况' },
];
const NAV_ITEMS = [
  { id: 'rehab', label: '康复思路', icon: '◎' }, { id: 'postop', label: '术后康复', icon: '▤' },
  { id: 'library', label: '资料库', icon: '▥' }, { id: 'me', label: '我的', icon: '◌' },
] as const;
function NavIcon({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{id === 'rehab' ? <path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7" /> : id === 'postop' ? <><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 2h6v4H9zM8 12h8m-4-4v8" /></> : id === 'library' ? <path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z" /> : <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}</svg>;
}

type NavId = typeof NAV_ITEMS[number]['id'];

async function getJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '服务暂不可用');
  return body as T;
}

function fieldVisible(dependency: string | null, profile: Record<string, string>) {
  if (!dependency) return true;
  const rule = dependency.includes(':') ? dependency.slice(dependency.indexOf(':') + 1) : dependency;
  return rule.split(/\s+AND\s+/i).every(part => {
    const [field, value] = part.trim().split('=');
    return profile[field] === value;
  });
}

function Chevron({ open = false, right = false }: { open?: boolean; right?: boolean }) {
  return <svg className={`card-chevron${open ? ' is-open' : ''}${right ? ' points-right' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

function AssessmentRow({ item, result, openedMapIds, onToggleMap }: {
  item: AssessmentItem; result: ResolveResult; openedMapIds: string[]; onToggleMap: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return <article className={`assessment-row${item.context_state === 'highlighted' ? ' assessment-row--highlighted' : ''}`}>
    <button className="assessment-row__head" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="assessment-row__heading"><span className="assessment-row__name">{item.name}</span>
        {!!item.context_sources.length && <span className="assessment-row__context">相关情况：{item.context_sources.map(source => source.label).join('、')}</span>}
      </span>
      <Chevron open={open} />
    </button>
    <div className={`card-expansion${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}><div className="card-expansion__clip"><div className="assessment-row__body">
      {[...new Set(item.context_sources.map(source => source.note).filter(Boolean))].map(note => <p className="assessment-row__context-note" key={note}>{note}</p>)}
      {item.clinical_purpose && <section className="detail-section"><h5>为什么看</h5><p>{item.clinical_purpose}</p></section>}
      <section className="detail-section detail-section--check"><h5><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>检查重点</h5><p>{item.check_focus}</p></section>
      {!!item.possible_findings.length && <section className="detail-section detail-section--findings">
        <h5>可能发现</h5>
        {item.possible_findings.map(finding => {
          const expanded = openedMapIds.includes(finding.feature_id);
          const canExpand = !!(finding.trigger_condition || finding.display_note || (finding.has_treatment && result.normal_intervention_actions_enabled));
          return <div className={`finding-row${expanded ? ' is-open' : ''}`} key={finding.feature_id}>
            {canExpand
              ? <button type="button" className="finding-row__head" aria-haspopup="dialog" aria-expanded={expanded} onClick={() => onToggleMap(finding.feature_id)}>
                <strong>{finding.name}</strong>
                <span className="finding-row__arrow"><Chevron right /></span>
              </button>
              : <div className="finding-row__head"><strong>{finding.name}</strong></div>}

          </div>;
        })}
      </section>}
    </div></div></div>
  </article>;
}


function FindingDrawer({ item, finding, result, onClose, onReviewLocation }: {
  item: AssessmentItem; finding: AssessmentItem['possible_findings'][number]; result: ResolveResult; onClose: () => void; onReviewLocation: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  function dismiss(afterClose = onClose) {
    if (closeTimer.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { afterClose(); return; }
    setClosing(true);
    closeTimer.current = setTimeout(afterClose, 220);
  }
  const closeButton = useRef<HTMLButtonElement>(null);
  const methods = result.intervention_references.filter(ref => ref.finding_id === finding.finding_id);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => { previous?.focus(); };
  }, []);
  return <div className={`finding-overlay${closing ? ' is-closing' : ''}`} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
    if (event.key === 'Tab') {
      const controls=[...(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))];
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first) { event.preventDefault(); last?.focus(); }
      else if(!event.shiftKey&&document.activeElement===last) { event.preventDefault(); first?.focus(); }
      event.stopPropagation();
    }
  }}>
    <div className="finding-scrim" onClick={() => dismiss()} aria-hidden="true" />
    <section className="finding-drawer" role="dialog" aria-modal="true" aria-labelledby="finding-title">
      <div className="finding-grip" aria-hidden="true" />
      <header><div><span>{item.name}</span><h3 id="finding-title">{finding.name}</h3></div><button ref={closeButton} type="button" aria-label="关闭发现详情" onClick={() => dismiss()}>×</button></header>
      <div className="finding-drawer__scroll">            <div className="finding-row__body">
              {finding.trigger_condition && <div className="finding-row__interpretation"><h6>如何理解</h6><p>{finding.trigger_condition}</p></div>}
              {finding.display_note && <aside className="finding-note"><strong>{finding.display_note.label}</strong><p>{finding.display_note.text}</p></aside>}
              {finding.location_review && <section className="finding-location-review">
                <p>{finding.location_review.prompt}</p>
                <button type="button" onClick={() => dismiss(onReviewLocation)}>{finding.location_review.action_label}<Chevron right /></button>
              </section>}
              {result.normal_intervention_actions_enabled && (!!finding.treatment_goals.length ? <section className="finding-treatment">
                <h6><NavIcon id="library" />处理参考</h6>
                {finding.treatment_goals.map((goal, index) => <div className="treatment-line" key={`${finding.feature_id}-${index}`}><strong>{goal.goal}</strong><ul>{goal.methods.map(method => <li key={method}>{method}</li>)}</ul>{goal.progression && <small>{goal.progression}</small>}</div>)}
              </section> : !finding.review_status && !!methods.length && <section className="finding-treatment"><h6><NavIcon id="library" />处理参考</h6><ul className="treatment-list">{methods.map(method => <li key={method.intervention_id}>{method.name}</li>)}</ul></section>)}
            </div></div>
    </section>
  </div>;
}

function AssessmentGroup({ group, result, openedMapIds, onToggleMap }: {
  group: Dimension['groups'][number]; result: ResolveResult; openedMapIds: string[]; onToggleMap: (id: string) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const direct = group.items.filter(item => item.display_mode !== 'EXPAND' || item.context_state === 'highlighted');
  const more = group.items.filter(item => item.display_mode === 'EXPAND' && item.context_state !== 'highlighted');
  const visibleItems = direct;
  const additionalItems = more;
  return <section className="assessment-group">
    <div className="assessment-group__head"><h4>{group.name}</h4><span>{group.items.length} 项</span></div>
    <div className="assessment-group__items">
      {visibleItems.map(item => <AssessmentRow key={item.item_id} item={item} result={result} openedMapIds={openedMapIds} onToggleMap={onToggleMap} />)}
    </div>
    {!!additionalItems.length && <section className="related-module">
      <button type="button" className="related-module__head" aria-expanded={showMore} onClick={() => setShowMore(value => !value)}>
        <span>其他相关项目 <small>{additionalItems.length} 项</small></span><Chevron open={showMore} />
      </button>
      <div className={`card-expansion${showMore ? ' is-open' : ''}`} inert={!showMore} aria-hidden={!showMore}><div className="card-expansion__clip">
        <div className="related-module__items">{additionalItems.map(item => <AssessmentRow key={item.item_id} item={item} result={result} openedMapIds={openedMapIds} onToggleMap={onToggleMap} />)}</div>
      </div></div>
    </section>}
  </section>;
}

function DimensionBrowser({ result, openedMapIds, onToggleMap, onChooseContext }: {
  result: ResolveResult; openedMapIds: string[]; onToggleMap: (id: string) => void; onChooseContext: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState(result.dimensions.find(dimension =>
    dimension.groups.some(group => group.items.some(item => item.display_mode === 'DEFAULT' || item.context_state === 'highlighted')))?.key || result.dimensions[0]?.key);
  const active = result.dimensions.find(d => d.key === selectedKey) || result.dimensions[0];
  if (!active) return <div className="sheet-empty">这个位置暂时没有评估项目。</div>;
  return <div className="direction-list" aria-label="评估方向">
    <div className="direction-tabs" aria-label="选择评估方向">{result.dimensions.map(dimension => {
      const count = new Set(dimension.groups.flatMap(group => group.items.filter(item => item.context_state === 'highlighted').map(item => item.item_id))).size;
      return <button key={dimension.key} type="button" data-dimension={dimension.key} aria-pressed={dimension.key === active.key} onClick={() => setSelectedKey(dimension.key)}>{dimension.label}{count > 0 && <span className="direction-tabs__count" aria-label={`${count} 个关联项目`}>{count}</span>}</button>;
    })}</div>
    <div key={active.key} className="direction-content" data-dimension={active.key}>{active.groups.length ? active.groups.map(group => <AssessmentGroup key={group.name} group={group} result={result} openedMapIds={openedMapIds} onToggleMap={onToggleMap} />) : <div className="direction-empty"><p>{active.description}</p><button type="button" onClick={onChooseContext}>查看相关活动 <Chevron right /></button></div>}</div>
  </div>;
}

export function App() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [regionId, setRegionId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [side, setSide] = useState('');
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [openedMapIds, setOpenedMapIds] = useState<string[]>([]);
  const [nav, setNav] = useState<NavId>('rehab');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [muscleExplorerOpen, setMuscleExplorerOpen] = useState(false);
  const muscleExplorerButtonRef = useRef<HTMLButtonElement>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const contextPanelRef = useRef<HTMLElement>(null);
  const contextButtonRef = useRef<HTMLButtonElement>(null);
  const [sheetClosing, setSheetClosing] = useState(false);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (sheetTimer.current) clearTimeout(sheetTimer.current); }, []);
  function openSheet() {
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
    sheetTimer.current = null;
    setSheetClosing(false); setSheetOpen(true);
  }
  function closeSheet() {
    if (sheetTimer.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSheetOpen(false); return; }
    setSheetClosing(true);
    sheetTimer.current = setTimeout(() => { setSheetOpen(false); setSheetClosing(false); sheetTimer.current = null; }, 220);
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getJson<Metadata>('/api/meta').then(setMetadata).catch(cause => setError(cause instanceof Error ? cause.message : '无法连接服务'));
  }, []);

  const requestedFindingIds = useMemo(() => {
    const maps = new Map(result?.dimensions.flatMap(dimension => dimension.groups.flatMap(group => group.items.flatMap(item =>
      item.possible_findings.filter(finding => !finding.review_status).map(finding => [finding.feature_id, finding.finding_id] as const)))) || []);
    return [...new Set(openedMapIds.map(id => maps.get(id)).filter((id): id is string => !!id))];
  }, [openedMapIds, result?.dimensions]);
  const requestedFindingKey = requestedFindingIds.join('|');

  useEffect(() => {
    if (!regionId) { setResult(null); return; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getJson<ResolveResult>('/api/resolve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...(areaId ? { localization_area_id: areaId } : { region_id: regionId }), side, patient_profile: profile, context_rule_ids: contextIds, confirmed_finding_ids: requestedFindingIds }),
      signal: controller.signal,
    }).then(setResult).catch(cause => { if (cause.name !== 'AbortError') setError(cause instanceof Error ? cause.message : '内容加载失败'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [regionId, areaId, side, profile, contextIds, requestedFindingKey]);

  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') { closeSheet(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>('button, select, input, [href]') || [])].filter(el => el.getClientRects().length);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [sheetOpen]);

  const activeItem = result?.dimensions.flatMap(d => d.groups.flatMap(g => g.items)).find(item => item.possible_findings.some(f => f.feature_id === openedMapIds[0]));
  const activeFinding = activeItem?.possible_findings.find(f => f.feature_id === openedMapIds[0]);
  const selectedRegion = metadata?.regions.find(region => region.region_id === regionId);
  const selectedArea = metadata?.localization_areas?.find(area => area.area_id === areaId);
  const selectionName = selectedArea?.display_name || selectedRegion?.l3_region;
  const moduleLabels = Object.fromEntries(metadata?.modules.map(module => [module.id, module.label]) || []);
  const selectedModules = selectedArea?.module_codes || (selectedRegion ? [selectedRegion.module] : []);
  const selectionModuleLabel = selectedModules.map(module => moduleLabels[module] || module).join(' / ');
  const selectedContexts = metadata?.contexts.filter(rule => rule.module_codes.some(module => selectedModules.includes(module))) || [];

  function selectRegion(id: string, selectedSide = '', selectedAreaId = '') {
    if (!metadata?.regions.some(region => region.region_id === id)) return;
    if (selectedAreaId && !metadata?.localization_areas?.some(area => area.area_id === selectedAreaId)) return;
    setRegionId(id); setAreaId(selectedAreaId); setSide(selectedSide); setResult(null); setContextIds([]); setOpenedMapIds([]);
    setNav('rehab'); setContextOpen(false); openSheet();
  }

  function toggleContext(id: string) {
    setContextIds(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]);
    setOpenedMapIds([]);
  }

  function chooseNav(id: NavId) {
    setNav(id);
    if (id !== 'rehab') closeSheet();
    else if (regionId) openSheet();
  }

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><span className="brand-mark">R<span>·</span></span><span><strong>RehabMind</strong><small>康复思路助手</small></span></div>
      <span className="header-meta">{nav === 'postop' ? '术后康复' : '下肢'}</span>
    </header>

    <main key={nav} className={`page-content${nav === 'rehab' ? ' page-content--model' : nav === 'postop' ? ' page-content--postop' : ''}`}>
      {nav === 'rehab' ? <div className="model-layout">
        <AnatomyStage active={!muscleExplorerOpen} onSelect={hit => selectRegion(hit.regionId, hit.side, hit.areaId)} selectedName={selectionName ? `${side === 'left' ? '左侧 · ' : side === 'right' ? '右侧 · ' : ''}${selectionName}` : undefined}
          selectionFooter={selectedRegion ? <button className="resume-card" type="button" onClick={openSheet}>
            <span className="resume-card__info"><small>{selectionModuleLabel}{side === 'left' ? ' · 左侧' : side === 'right' ? ' · 右侧' : ''}</small><strong>{selectionName}</strong></span>
            <span className="resume-card__action">查看思路 <Chevron right /></span>
          </button> : undefined} />
        {error && !sheetOpen && <div className="error-card">{error}<button type="button" onClick={() => window.location.reload()}>重新加载</button></div>}
      </div> : nav === 'postop' ? <PostoperativeLibrary /> : <div className="module-empty"><span className="module-empty__mark">{NAV_ITEMS.find(item => item.id === nav)?.icon}</span><h1>{NAV_ITEMS.find(item => item.id === nav)?.label}</h1><p>这里暂时没有可查看的内容。</p><button type="button" onClick={() => chooseNav('rehab')}>返回康复思路</button></div>}
    </main>

    <nav className="bottom-nav" aria-label="主要模块">{NAV_ITEMS.map(item => <button key={item.id} type="button" className={nav === item.id ? 'is-active' : ''} aria-current={nav === item.id ? 'page' : undefined} onClick={() => chooseNav(item.id)}><span className="bottom-nav__icon"><NavIcon id={item.id} /></span><span>{item.label}</span></button>)}</nav>

    {nav === 'rehab' && !sheetOpen && <button ref={muscleExplorerButtonRef} className="muscle-explorer-tab" type="button" aria-label="打开肌肉图谱" aria-haspopup="dialog" aria-expanded={muscleExplorerOpen} onClick={() => setMuscleExplorerOpen(true)}>
      <svg viewBox="0 0 24 40" aria-hidden="true"><circle cx="12" cy="5" r="3" /><path d="M8 11h8l3 11-3 1-2-7v9l2 12h-3l-1-10-1 10H8l2-12v-9l-2 7-3-1 3-11Z" /><path d="M12 11v12M9 16h6" /></svg><span>肌肉</span>
    </button>}
    {muscleExplorerOpen && <MuscleExplorer onClose={() => { setMuscleExplorerOpen(false); requestAnimationFrame(() => muscleExplorerButtonRef.current?.focus()); }} />}

    {sheetOpen && selectedRegion && <>
      <div className={`sheet-backdrop${sheetClosing ? ' is-closing' : ''}`} onClick={closeSheet} />
      <section ref={sheetRef} inert={!!activeFinding} className={`reasoning-sheet${sheetClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <header className="reasoning-sheet__header">
          <div className="sheet-grip" aria-hidden="true" />
          <div className="reasoning-sheet__top"><div><span className="sheet-overline">康复思路</span><h2 id="sheet-title">{selectionName}</h2><small>{selectionModuleLabel} · {side === 'left' ? '左侧' : side === 'right' ? '右侧' : '侧别未指定'}</small></div><button ref={closeRef} type="button" onClick={closeSheet} aria-label="返回人体模型">×</button></div>
        </header>
        <div className="reasoning-sheet__scroll">
          {error && <div className="sheet-error">{error}</div>}
          {loading && !result && <div className="sheet-loading" role="status">正在载入评估方向…</div>}
          {result && <>
            {!!result.safety_alerts.length && <section className="safety-panel" role="alert"><span className="eyebrow-small">需要留意的情况</span><h3>先关注风险</h3>{result.safety_alerts.map(alert => <div key={alert.rule_id}><strong>{alert.title}</strong><p>{alert.guidance}</p></div>)}</section>}
            <RelatedTissues key={`tissues:${areaId || regionId}`} groups={result.related_tissues || []} />
            <ConsultationGuide key={`consultation:${areaId || regionId}`} questions={result.consultation_guide || []} />
            <section ref={contextPanelRef} className="context-panel"><button ref={contextButtonRef} type="button" className="context-panel__head" aria-expanded={contextOpen} onClick={() => setContextOpen(value => !value)}><span className="context-panel__title"><span className="context-panel__icon"><NavIcon id="me" /></span><span><strong>患者与症状信息</strong><small>可选填写</small></span></span><Chevron open={contextOpen} /></button>
              <div className={`card-expansion${contextOpen ? ' is-open' : ''}`} inert={!contextOpen} aria-hidden={!contextOpen}><div className="card-expansion__clip">
              <div className="context-panel__body">
                {!!metadata?.profile_schema.length && <div className="profile-grid">{metadata.profile_schema.filter(field => fieldVisible(field.dependency, profile)).map(field => <label key={field.id}><span>{field.label}</span><select value={profile[field.id] || ''} onChange={event => { const value = event.target.value; setProfile(old => ({ ...old, [field.id]: value, ...(field.id === 'sex' && value !== 'female' ? { female_stage: '' } : {}) })); }}><option value="">未填写</option>{Object.entries(field.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>}
                {CONTEXT_GROUPS.map(group => { const rules = selectedContexts.filter(rule => rule.public_group === group.type); return !!rules.length && <div className="context-group" key={group.type}><h4>{group.label}</h4><div className="context-options">{rules.map(rule => <label key={rule.rule_id}><input type="checkbox" checked={contextIds.includes(rule.rule_id)} onChange={() => toggleContext(rule.rule_id)} /><span>{rule.public_label}</span></label>)}</div></div>; })}
              </div>
              </div></div>
            </section>
            {!!result.clinical_considerations.length && <section className="consideration-panel"><h3>额外临床考虑</h3><ul>{result.clinical_considerations.map(value => <li key={value}>{value}</li>)}</ul></section>}
            <DimensionBrowser key={`assessment:${areaId || regionId}`} result={result} openedMapIds={openedMapIds} onToggleMap={id => setOpenedMapIds([id])} onChooseContext={() => {
              setContextOpen(true);
              contextPanelRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
              contextButtonRef.current?.focus({ preventScroll: true });
            }} />
          </>}
        </div>
      </section>
      {result && activeItem && activeFinding && <FindingDrawer item={activeItem} finding={activeFinding} result={result} onClose={() => setOpenedMapIds([])} onReviewLocation={closeSheet} />}
    </>}
  </div>;
}
