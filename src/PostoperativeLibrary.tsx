import { useEffect, useRef, useState } from 'react';
import guides from './content/postop-professional.json';

type Guide = typeof guides[number];
const categories = ['全部', '膝关节', '足踝'];
function BookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z" /></svg>;
}
function Arrow() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>; }
function ObservationIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>; }
function Lines({ items }: { items: string[] }) {
  return <ul className="postop-lines">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

function ProfessionalGuide({ guide, onBack }: { guide: Guide; onBack: () => void }) {
  const [pathId, setPathId] = useState(guide.default_path);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const backRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const path = guide.paths.find(item => item.id === pathId)!;
  const phases = guide.phases.filter(item => path.phase_ids.includes(item.id));
  const basePhase = phases[phaseIndex];
  const phase = basePhase ? { ...basePhase, ...basePhase.path_overrides.find(item => item.path_id === pathId) } : undefined;
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onBack(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onBack]);
  function selectStage(index: number) {
    setPhaseIndex(index);
    stageRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <article className="postop-reader" aria-label={guide.title}>
    <button ref={backRef} className="postop-back" type="button" onClick={onBack}><span aria-hidden="true">‹</span> 全部资料</button>
    <header className="postop-hero">
      <div className="postop-eyebrow">{guide.category} <span>康复师参考</span></div>
      <h1>{guide.title}</h1><p>{guide.subtitle}</p>
      <div className="postop-hero__rule"><BookIcon /><span>按组织保护与功能表现推进，周数仅供对照</span></div>
    </header>
    <section className="postop-paths" aria-labelledby="postop-path-title">
      <h2 id="postop-path-title">治疗路径</h2>
      <label className="postop-path-select"><select aria-label="选择治疗路径" value={pathId} onChange={event => { setPathId(event.target.value); setPhaseIndex(0); }}>{guide.paths.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><Arrow /></label>
      <div className="postop-path-summary" key={pathId}>
        <p>{path.scope}</p>
        <div className="postop-protection"><strong>保护重点</strong><p>{path.protection}</p></div>
        <details className="postop-disclosure"><summary>术式核对与适用范围 <Arrow /></summary><div><Lines items={guide.checks} /><p className="postop-exclusion"><strong>需另行考虑</strong>{path.exclude}</p></div></details>
      </div>
    </section>
    {phase ? <div ref={stageRef} className="postop-stage-layout">
      <nav className="postop-stages" aria-label="康复阶段">{phases.map((item, index) => <button key={item.id} type="button" aria-current={index === phaseIndex ? 'step' : undefined} onClick={() => selectStage(index)}><span className="postop-stage-number">{String(index + 1).padStart(2, '0')}</span><span>{item.title}</span><Arrow /></button>)}</nav>
      <div className="postop-phase" key={pathId + phase.id}>
        <header className="postop-phase__head"><span>阶段 {phaseIndex + 1} / {phases.length}</span>{path.show_time && phase.time && <span className="postop-time">时间对照 · {phase.time}</span>}<h2>{phase.title}</h2><Lines items={phase.goals} /></header>
        <section className="postop-block postop-block--assessment"><h3><ObservationIcon />评估重点</h3><Lines items={phase.assessment} /></section>
        <section className="postop-block postop-block--training"><h3><BookIcon />训练参考</h3><div className="postop-methods">{phase.exercises.map((exercise, index) => <details className="postop-method" key={phase.id + index}><summary><span>{exercise.name}</span><Arrow /></summary><div><p>{exercise.purpose}</p>{exercise.details.filter(item => item.label === '停止或退阶').map((item, i) => <p className="postop-method__note" key={i}><strong>负荷观察</strong>{item.text}</p>)}</div></details>)}</div></section>
        <section className="postop-block postop-block--progression"><h3><span className="postop-section-mark" aria-hidden="true">↗</span>进阶依据</h3><Lines items={phase.progression} /></section>
        <details className="postop-disclosure postop-stage-notes"><summary>本阶段限制与异常反应 <Arrow /></summary><div><h4>负荷限制</h4><Lines items={phase.protection} /><h4>需要暂停并复核的情况</h4><Lines items={phase.alerts} /></div></details>
      </div>
    </div> : <section className="postop-special-path"><h2>该路径的评估与衔接</h2><p>{path.connection}</p><p>阶段训练结合该术式的专属保护方案查阅。</p></section>}
    <section className="postop-references" aria-label="补充资料">
      <details className="postop-disclosure"><summary>回归活动评估 <Arrow /></summary><div><Lines items={guide.return_criteria} /></div></details>
      <details className="postop-disclosure"><summary>参考文献与完整资料 <Arrow /></summary><div><ol>{guide.references.map((reference, i) => <li key={i}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title} ↗</a><p>{reference.scope}</p></li>)}</ol><a className="postop-original" href={import.meta.env.BASE_URL + guide.file} target="_blank" rel="noopener noreferrer">打开完整原文与动作资料 ↗</a></div></details>
    </section>
  </article>;
}

export function PostoperativeLibrary() {
  const [category, setCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Guide | null>(null);
  const lastCardId = useRef('');
  const listRef = useRef<HTMLElement>(null);
  function closeReader() {
    setSelected(null);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('[data-guide-id="' + lastCardId.current + '"]')?.focus());
  }
  const filtered = guides.filter(guide => (category === '全部' || guide.category === category)
    && (guide.name + ' ' + guide.subtitle + ' ' + guide.chapters.join(' ') + ' ' + guide.paths.map(item => item.title).join(' ')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (selected) return <ProfessionalGuide key={selected.id} guide={selected} onBack={closeReader} />;
  return <section ref={listRef} className="postop-library">
    <header className="postop-library__head"><span className="postop-eyebrow">康复师参考</span><h1>术后康复</h1><p>先看术式保护，再看阶段重点</p></header>
    <label className="postop-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input type="search" placeholder="搜索术式，如 ACL、MPFL、跟腱" aria-label="搜索术后康复资料" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="postop-filters" role="group" aria-label="按部位筛选">{categories.map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
    <div className="postop-grid">{filtered.map(guide => <button key={guide.id} data-guide-id={guide.id} className={'postop-guide' + (guide.category === '足踝' ? ' is-foot' : '')} type="button" onClick={() => { lastCardId.current = guide.id; setSelected(guide); window.scrollTo({ top: 0 }); }}>
      <div className="postop-guide__body"><span className="postop-guide__category">{guide.category}</span><h2>{guide.title}</h2><p>{guide.subtitle}</p><div className="postop-guide__meta"><span>{guide.phases.length === 8 ? '2 条阶段路径' : guide.phases.length + ' 个阶段'}</span><span>保护 · 评估 · 训练</span></div></div><span className="postop-guide__arrow"><Arrow /></span>
    </button>)}</div>
    {!filtered.length && <p className="postop-no-results" role="status">没有找到相关资料，请换一个关键词。</p>}
  </section>;
}

