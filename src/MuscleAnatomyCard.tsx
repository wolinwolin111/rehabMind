import { getMuscleAnatomy } from './content/muscle-anatomy';
import { getBoneAnatomy } from './content/bone-anatomy';
import { getTendonAnatomy } from './content/tendon-anatomy';
import { muscleModelObservation } from './content/muscle-model-review';
import { muscleBookReference } from './content/muscle-book-reference';
import { importedMuscleModel } from './content/imported-muscle-models';
export function MuscleAnatomyCard({ name, boneName, tendonName }: { name?: string; boneName?: string; tendonName?:string }) {
  const facts = name ? getMuscleAnatomy(name) : null;
  const book = name ? muscleBookReference(name) : null;
  const model = importedMuscleModel(name || tendonName);
  const bone = boneName ? getBoneAnatomy(boneName) : null;
  const tendon = tendonName ? getTendonAnatomy(tendonName) : null;
  return <section className="muscle-anatomy" aria-label="组织解剖说明">
    {facts ? <>
      <dl><dt>起点</dt><dd>{facts.origin}</dd><dt>止点</dt><dd>{facts.insertion}</dd><dt>主要功能</dt><dd>{facts.action}</dd></dl>
      {facts.note && <p>{facts.note}</p>}
      {name && muscleModelObservation(name) && <p className="muscle-anatomy__notice">{muscleModelObservation(name)}</p>}
      <details><summary>参考资料</summary>{book && <p>{book.label}</p>}{book?.reviewNote && <p>{book.reviewNote}</p>}<p>补充核对：<a href={facts.source} target="_blank" rel="noreferrer">{facts.sourceLabel || '解剖参考'}</a>。文案为解剖概述，不能替代模型附着点的核查。</p>{model && <p>模型来源：<a href={model.url} target="_blank" rel="noreferrer">Z-Anatomy（LluisV / 贡献者）</a>，{model.license}。{model.note}{model.limitation}</p>}</details>
    </> : bone ? <>
      <dl><dt>形态</dt><dd>{bone.shape}</dd><dt>骨性标志</dt><dd>{bone.landmarks}</dd><dt>观察用途</dt><dd>{bone.context}</dd></dl>
      <details><summary>参考资料</summary><p>标志为文字教学说明，模型未逐点标注。<a href={bone.source} target="_blank" rel="noreferrer">UAMS 骨骼解剖参考</a></p></details>
    </> : tendon ? <>
      <dl><dt>{tendon.connectionLabel}</dt><dd>{tendon.connection}</dd><dt>{tendon.attachmentLabel}</dt><dd>{tendon.attachment}</dd><dt>主要作用</dt><dd>{tendon.function}</dd></dl><p>{tendon.note}</p>
      <details><summary>参考资料</summary><p><a href={tendon.source} target="_blank" rel="noreferrer">{tendon.sourceLabel}</a></p>{model && <p>模型来源：<a href={model.url} target="_blank" rel="noreferrer">Z-Anatomy（LluisV / 贡献者）</a>，{model.license}。{model.note}{model.limitation}</p>}</details>
    </> : <p>{name ? '这块肌肉的起止点与功能尚未收录。' : '单击肌肉、骨骼或连接组织，查看对应的解剖说明。'}</p>}
  </section>;
}
