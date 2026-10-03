/** Shared icon and title slots for the three consultation accordions. */
export function PanelHeading({ icon, title, note }: {
  icon: 'tissues' | 'consultation' | 'patient'; title: string; note?: string;
}) {
  return <>
    <span className="panel-heading__icon"><svg viewBox="0 0 24 24" aria-hidden="true">
      {icon === 'tissues' ? <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" /></>
        : icon === 'consultation' ? <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-6 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></>
          : <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}
    </svg></span>
    <span className="panel-heading__label"><strong>{title}</strong>{note && <small>{note}</small>}</span>
  </>;
}
