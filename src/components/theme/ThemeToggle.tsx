import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-200',
        'border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10',
        className,
      )}
    >
      <div className="relative h-4 w-4">
        <Sun
          size={16}
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-out',
            theme === 'dark'
              ? 'rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100',
          )}
        />
        <Moon
          size={16}
          className={cn(
            'absolute inset-0 transition-all duration-300 ease-out',
            theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0',
          )}
        />
      </div>
    </button>
  );
}
