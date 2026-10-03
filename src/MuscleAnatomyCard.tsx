import { getMuscleAnatomy, supplementalMuscles } from './content/muscle-anatomy';
import { getBoneAnatomy } from './content/bone-anatomy';
export function MuscleAnatomyCard({ name, boneName, supplement = '', onSupplement }: { name?: string; boneName?: string; supplement?: string; onSupplement?: (name: string) => void }) {
  const facts = name ? getMuscleAnatomy(name) : null;
  const bone = boneName ? getBoneAnatomy(boneName) : null;
  return <section className="muscle-anatomy" aria-label="肌肉解剖说明">
    {supplement && <p className="muscle-anatomy__notice">这块肌肉暂无独立模型，以下为解剖文字资料。</p>}
    {facts ? <>
      <dl><dt>起点</dt><dd>{facts.origin}</dd><dt>止点</dt><dd>{facts.insertion}</dd><dt>主要功能</dt><dd>{facts.action}</dd></dl>
      {facts.note && <p>{facts.note}</p>}
      <details><summary>参考资料</summary><p>常见解剖的教学概述；模型未标记实际附着点。<a href={facts.source} target="_blank" rel="noreferrer">{facts.sourceLabel || '解剖参考'}</a></p></details>
    </> : bone ? <>
      <dl><dt>形态</dt><dd>{bone.shape}</dd><dt>骨性标志</dt><dd>{bone.landmarks}</dd><dt>观察用途</dt><dd>{bone.context}</dd></dl>
      <details><summary>参考资料</summary><p>标志为文字教学说明，模型未逐点标注。<a href={bone.source} target="_blank" rel="noreferrer">UAMS 骨骼解剖参考</a></p></details>
    </> : <p>{name ? '这块肌肉的起止点与功能尚未收录。' : '单击肌肉查看起点、止点与功能；单击骨骼查看形态与骨性标志。'}</p>}
    {onSupplement && <label className="muscle-supplement">模型未收录的肌肉
      <select aria-label="查看补充肌肉资料" value={supplement} onChange={event => onSupplement(event.target.value)}>
        <option value="">选择文字资料</option>
        {supplementalMuscles.map(muscle => <option key={muscle.name} value={muscle.name}>{muscle.displayName} · 暂无模型</option>)}
      </select>
    </label>}
  </section>;
}
