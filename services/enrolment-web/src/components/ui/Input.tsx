import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 text-sm text-slate-900 shadow-sm backdrop-blur-sm placeholder:text-slate-400 transition-all duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:shadow-glow disabled:bg-slate-50 disabled:text-slate-400',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        )}
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
