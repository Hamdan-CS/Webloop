import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function Select({ label, value, options, onChange, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={cn('block', className)} ref={rootRef}>
      {label && (
        <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border bg-ink-900/60 px-3 py-2.5 text-left text-sm text-slate-200 transition-colors',
            open ? 'border-accent-400/40' : 'border-white/10 hover:border-white/20',
          )}
        >
          <span className="truncate">{current?.label ?? 'Select…'}</span>
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 overflow-auto rounded-lg border border-white/10 bg-ink-900/95 backdrop-blur-md py-1 shadow-card animate-fade-in-up"
          >
            {options.map((o) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                    isSelected ? 'bg-accent-500/15 text-accent-200' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
