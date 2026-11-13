import { useId, useMemo, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toneFor, initialsOf } from './tone';

/*
 * Workspace UI primitives, ported from the v3 demo's #app block
 * (styles in design-system/styles/app.css). Thin, presentational wrappers:
 * they take normal HTML props so existing handlers pass straight through.
 */


/* ---------- buttons (.btn-d dark pill, .btn-l light pill) ---------- */
export function WButton({ tone = 'dark', size, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'dark' | 'light'; size?: 'sm' }) {
  return <button type="button" className={cn(tone === 'dark' ? 'w-btn-d' : 'w-btn-l', size === 'sm' && 'w-btn-sm', className)} {...props} />;
}

/* ---------- chip (.cchip, .on when selected) ---------- */
export function WChip({ on, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  if (!props.onClick) return <span className={cn('w-chip', on && 'on', className)}>{children}</span>;
  return <button type="button" aria-pressed={on} className={cn('w-chip', on && 'on', className)} {...props}>{children}</button>;
}

/* ---------- card (.box with optional .box-h header) ---------- */
export function WBox({ title, meta, children, className, inner }: { title?: ReactNode; meta?: ReactNode; children?: ReactNode; className?: string; inner?: boolean }) {
  return (
    <section className={cn(inner ? 'w-inner' : 'w-box', className)}>
      {(title || meta) && (
        <div className="w-box-h">
          {title && <b>{title}</b>}
          {meta && <small>{meta}</small>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- page header (.vh: title, one-line subtitle, actions right) ---------- */
export function WPageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="w-vh">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="acts">{actions}</div>}
    </header>
  );
}

/* ---------- avatar (.av, pastel initials or image) ---------- */
export function WAvatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span className={cn('w-av', className)} style={{ width: size, height: size, background: src ? undefined : toneFor(name), fontSize: Math.max(10, size * 0.34) }} title={name}>
      {src ? <img src={src} alt={name} loading="lazy" /> : initialsOf(name)}
    </span>
  );
}

/* ---------- KPI tiles (.kpis/.kpi k1–k4) ---------- */
export function WKpis({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="w-kpis">
      {items.map((k, i) => (
        <div key={k.label} className={`w-kpi k${(i % 4) + 1}`}><small>{k.label}</small><b>{k.value}</b></div>
      ))}
    </div>
  );
}

/* ---------- contribution heatmap (.mini-gh, 26 weeks × 7 days) ---------- */
export function WHeatmap({ levels, weeks = 26, label = 'Contribution graph' }: { levels?: number[]; weeks?: number; label?: string }) {
  const cells = useMemo(() => {
    const n = weeks * 7;
    if (levels) return Array.from({ length: n }, (_, i) => levels[i] ?? 0);
    return Array.from({ length: n }, () => 0);
  }, [levels, weeks]);
  return (
    <div className="w-heat" role="img" aria-label={label} style={{ gridTemplateColumns: `repeat(${weeks},1fr)` }}>
      {cells.map((v, i) => <i key={i} className={v ? `l${Math.min(4, v)}` : undefined} />)}
    </div>
  );
}

/* ---------- verified work row (green check, pending ring) ---------- */
export function WVerifiedRow({ label, meta, time, pending }: { label: ReactNode; meta?: ReactNode; time?: ReactNode; pending?: boolean }) {
  return (
    <div className={cn('w-vrow', pending && 'wait')}>
      <span className="ck">{!pending && <Check size={12} strokeWidth={3.2} />}</span>
      <span>{label}{meta && <> <small>{meta}</small></>}</span>
      <small>{time ?? (pending ? 'pending' : '')}</small>
    </div>
  );
}

/* ---------- form fields (white, radius 12, hairline, iris focus ring) ---------- */
type FieldShell = { label?: ReactNode; hint?: ReactNode; className?: string };
function Field({ label, hint, className, id, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={cn('w-field', className)}>
      {label && <label className="w-label" htmlFor={id}>{label}</label>}
      {children}
      {hint && <span className="w-hint">{hint}</span>}
    </div>
  );
}
export function WInput({ label, hint, className, id, ...props }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId(); const fid = id ?? auto;
  return <Field label={label} hint={hint} className={className} id={fid}><input id={fid} className="w-input" {...props} /></Field>;
}
export function WTextarea({ label, hint, className, id, ...props }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId(); const fid = id ?? auto;
  return <Field label={label} hint={hint} className={className} id={fid}><textarea id={fid} className="w-input" {...props} /></Field>;
}
export function WSelect({ label, hint, className, id, children, ...props }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId(); const fid = id ?? auto;
  return <Field label={label} hint={hint} className={className} id={fid}><select id={fid} className="w-input" {...props}>{children}</select></Field>;
}
