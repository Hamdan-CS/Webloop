import { cn } from '@/utils/cn';

/**
 * On/off switch. 44×24 track, 20×20 knob with an even 2px gap.
 * The knob uses a literal #fff on purpose: Tailwind's `white` is remapped to
 * the theme text colour (dark ink in the light theme).
 */
export function Switch({
  checked,
  onChange,
  label,
  id,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name when there is no visible <label htmlFor>. */
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-block h-6 w-11 shrink-0 rounded-full p-0 transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent-500' : 'bg-[#d4d8de] dark:bg-[#3b4250]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform duration-200 ease-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
        style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.18), 0 1px 1px rgba(0,0,0,.08)' }}
      />
    </button>
  );
}
