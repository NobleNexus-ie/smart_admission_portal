import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-brand-500 border-t-transparent',
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
    >
      <div className="relative">
        <Spinner size="lg" />
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-brand-300 opacity-20" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </motion.div>
  );
}
