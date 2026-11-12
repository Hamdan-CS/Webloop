import { useEffect, useMemo, useRef, useState } from 'react';

export interface Command { label: string; hint: string; run(): void }

/**
 * The demo's ⌘K command palette (.cmdk): type to filter, ↑/↓ to move,
 * Enter to run, Esc or a click outside to close.
 */
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose(): void; commands: Command[] }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())), [commands, q]);

  useEffect(() => {
    if (!open) return;
    setQ(''); setSel(0);
    const id = window.setTimeout(() => inRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const run = (c?: Command) => { if (!c) return; onClose(); c.run(); };

  return (
    <div className={`w-cmdk${open ? ' w-open' : ''}`} role="dialog" aria-modal="true" aria-label="Quick search" aria-hidden={!open} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-cmdk-in">
        <input
          ref={inRef}
          value={q}
          placeholder="Search projects, people, actions…"
          autoComplete="off"
          aria-label="Search commands"
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            if (e.key === 'Enter') run(list[sel]);
            if (e.key === 'Escape') onClose();
          }}
        />
        <ul role="listbox">
          {list.map((c, i) => (
            <li key={c.label} role="option" aria-selected={i === sel} className={i === sel ? 'w-on' : ''} onMouseEnter={() => setSel(i)} onClick={() => run(c)}>
              {c.label}<small>{c.hint}</small>
            </li>
          ))}
          {!list.length && <li aria-disabled="true">No matches<small>Esc</small></li>}
        </ul>
      </div>
    </div>
  );
}
