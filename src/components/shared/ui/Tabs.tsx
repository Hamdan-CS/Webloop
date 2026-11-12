import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem { id: string; label: string; count?: number }

/**
 * GitHub-style tabs: mono labels, one iris underline that slides to the
 * selected tab, arrow/Home/End keys move between tabs (roving tabindex).
 */
export function Tabs({ items, value, onChange, className, ariaLabel }: { items: TabItem[]; value: string; onChange(id: string): void; className?: string; ariaLabel?: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
      if (el) setBar({ left: el.offsetLeft + 8, width: el.offsetWidth - 16 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, items]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === value);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(items[n].id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(items[n].id)}"]`)?.focus();
  };

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} className={cn('tabs g-tabs', className)} onKeyDown={onKey}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          data-tab={t.id}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
      <span className="g-tabs-bar" style={{ transform: `translateX(${bar.left}px)`, width: bar.width }} aria-hidden="true" />
    </div>
  );
}
