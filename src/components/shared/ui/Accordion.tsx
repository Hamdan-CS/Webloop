import { useId, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';

/** Genie FAQ accordion: bone rows, 32px radius, grid-rows open/close (0.65s). One open at a time. */
export function Accordion({ items, defaultOpen = 0 }: { items: { q: string; a: ReactNode }[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number>(defaultOpen);
  const id = useId();
  return (
    <div className="g-acc">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className={`g-acc-item${isOpen ? ' is-open' : ''}`}>
            <button type="button" aria-expanded={isOpen} aria-controls={`${id}-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
              {it.q}
              <i aria-hidden="true"><Plus size={16} /></i>
            </button>
            <div className="g-acc-a" id={`${id}-${i}`} role="region">
              <div><div className="g-acc-p">{it.a}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
