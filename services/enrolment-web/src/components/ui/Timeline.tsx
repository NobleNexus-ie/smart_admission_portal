import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const icons = {
  completed: CheckCircle2,
  current: Clock,
  upcoming: Circle,
};

const styles = {
  completed: 'text-emerald-600',
  current: 'text-brand-600',
  upcoming: 'text-slate-300',
};

export function Timeline({ events, className }: TimelineProps) {
  if (!events.length) {
    return (
      <p className="text-sm text-slate-500">No timeline events yet.</p>
    );
  }

  return (
    <ol className={cn('space-y-0', className)}>
      {events.map((event, i) => {
        const Icon = icons[event.status];
        const isLast = i === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 h-full w-px bg-slate-200"
                aria-hidden
              />
            )}
            <span className={cn('mt-0.5 shrink-0', styles[event.status])}>
              <Icon className="h-[22px] w-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  event.status === 'upcoming'
                    ? 'text-slate-400'
                    : 'text-slate-900',
                )}
              >
                {event.title}
              </p>
              {event.description && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {event.description}
                </p>
              )}
              {event.timestamp && event.status !== 'upcoming' && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(event.timestamp).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
