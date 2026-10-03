import { useEffect, useRef, useState } from 'react';
import { AnatomyStage } from './AnatomyStage';

export function MuscleExplorer({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function close() {
    if (timerRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { closeRef.current(); return; }
    setClosing(true);
    timerRef.current = setTimeout(() => closeRef.current(), 240);
  }

  return <dialog ref={dialogRef} className={`muscle-explorer${closing ? ' is-closing' : ''}`} aria-labelledby="muscle-explorer-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
    <header className="muscle-explorer__header"><div><h2 id="muscle-explorer-title">肌肉图谱</h2><p>逐层查看全身运动肌肉，点选查看解剖说明</p></div><button type="button" autoFocus aria-label="收起肌肉图谱" onClick={close}>×</button></header>
    <div className="muscle-explorer__model"><AnatomyStage purpose="muscle" active={!closing} /></div>
  </dialog>;
}
