import { useId, useState } from 'react';
import type { ConsultationQuestion } from './types';

function Chevron({ open }: { open: boolean }) {
  return <svg className={`card-chevron${open ? ' is-open' : ''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

function Question({ question }: { question: ConsultationQuestion }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <article className="consultation-question">
    <h4>{question.topic}</h4>
    <p className="consultation-question__prompt">{question.core_prompt}</p>
    <button type="button" className="consultation-question__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span>追问与评估提示</span><Chevron open={open} />
    </button>
    <div id={id} className={`card-expansion${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}><div className="card-expansion__clip">
      <div className="consultation-question__details">
        {question.optional_probe && <section><h5>还可以问</h5><p>{question.optional_probe}</p></section>}
        <section><h5>为什么这样问</h5><p>{question.question_purpose}</p></section>
        <section><h5>能了解什么</h5><p>{question.information_gained}</p></section>
        <section><h5>对后续评估的帮助</h5><p>{question.assessment_help}</p></section>
      </div>
    </div></div>
  </article>;
}

export function ConsultationGuide({ questions }: { questions: ConsultationQuestion[] }) {
  const [open, setOpen] = useState(false);
  const [commonOpen, setCommonOpen] = useState(false);
  const id = useId();
  const commonId = useId();
  const regional = questions.filter(question => question.scope !== 'GENERAL');
  const common = questions.filter(question => question.scope === 'GENERAL');
  if (!questions.length) return null;
  return <section className="consultation-panel">
    <button type="button" className="consultation-panel__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span className="consultation-panel__title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-6 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></svg><strong>问诊思路</strong></span>
      <Chevron open={open} />
    </button>
    <div id={id} className={`card-expansion${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}><div className="card-expansion__clip">
      <div className="consultation-panel__body">
        {regional.map(question => <Question key={question.guide_id} question={question} />)}
        {regional.length > 0 ? <section className="consultation-common">
          <button type="button" className="consultation-question__toggle" aria-expanded={commonOpen} aria-controls={commonId} onClick={() => setCommonOpen(value => !value)}><span>通用补充</span><Chevron open={commonOpen} /></button>
          <div id={commonId} className={`card-expansion${commonOpen ? ' is-open' : ''}`} inert={!commonOpen} aria-hidden={!commonOpen}><div className="card-expansion__clip">{common.map(question => <Question key={question.guide_id} question={question} />)}</div></div>
        </section> : common.map(question => <Question key={question.guide_id} question={question} />)}
      </div>
    </div></div>
  </section>;
}
