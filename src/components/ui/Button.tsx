import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn bg-signal-rose/15 text-signal-rose hover:bg-signal-rose/25 border border-signal-rose/30',
};

const sizeClass: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-5 py-3 gap-2',
};

export function Button({ variant = 'primary', size, className, ...props }: ButtonProps) {
  return <button className={cn(variantClass[variant], size && sizeClass[size], className)} {...props} />;
}
