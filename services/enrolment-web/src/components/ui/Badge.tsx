import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/60',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/60',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/60',
  neutral: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/60',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
};

export function Badge({ children, variant = 'default', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
