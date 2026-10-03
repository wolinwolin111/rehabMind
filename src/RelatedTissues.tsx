import { useId, useState } from 'react';
import type { ResolveResult } from './types';
import { PanelHeading } from './PanelHeading';

export function RelatedTissues({ groups }: { groups: ResolveResult['related_tissues'] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!groups.length) return null;
  return <section className="tissue-panel">
    <button type="button" className="tissue-panel__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <PanelHeading icon="tissues" title="周围有哪些组织" /><svg className={`card-chevron${open ? ' is-open' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div id={id} className={`card-expansion${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}><div className="card-expansion__clip">
      <div className="tissue-panel__body">{groups.map(group => <section key={group.category}><h4>{group.category}</h4><ul>{group.tissues.map(tissue => <li key={tissue}>{tissue}</li>)}</ul></section>)}</div>
    </div></div>
  </section>;
}
