import { Moon, Sun } from 'lucide-react';
import { useTheme, DARK_MODE_ENABLED } from '@/design-system/components/ThemeProvider';
import { cn } from '@/utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
  if (!DARK_MODE_ENABLED) return null;
  return <ThemeToggleButton className={className} />;
}

function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn('hdr-theme relative', className)}
    >
      <div className="relative h-4 w-4">
        <Sun
          size={16}
          className={cn(
            'absolute inset-0 transition-[transform,opacity] duration-300 ease-out',
            theme === 'dark'
              ? 'rotate-90 scale-95 opacity-0'
              : 'rotate-0 scale-100 opacity-100',
          )}
        />
        <Moon
          size={16}
          className={cn(
            'absolute inset-0 transition-[transform,opacity] duration-300 ease-out',
            theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-95 opacity-0',
          )}
        />
      </div>
    </button>
  );
}
