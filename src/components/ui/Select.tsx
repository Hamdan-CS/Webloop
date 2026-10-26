import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Select({ label, value, options, onChange, className, disabled, size = 'md' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
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
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border bg-ink-900/60 text-left text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2.5 text-sm',
            open ? 'border-accent-400/40' : 'border-white/10 hover:border-white/20',
          )}
        >
          <span className="truncate">{current?.label ?? 'Select…'}</span>
          <ChevronDown
            size={size === 'sm' ? 12 : 14}
            className={cn('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
          />
        </button>
        {open &&
          position &&
          createPortal(
            <div
              ref={panelRef}
              role="listbox"
              style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
              className="z-[60] max-h-60 overflow-auto rounded-lg border border-white/10 bg-ink-900/95 backdrop-blur-md py-1 shadow-card animate-fade-in-up"
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
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
