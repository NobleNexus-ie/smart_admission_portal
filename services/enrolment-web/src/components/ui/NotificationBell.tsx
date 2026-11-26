import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  MailCheck,
  Send,
  X,
  Inbox,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsApi, type NotificationItem } from '@/api/notifications';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function groupByDate(items: NotificationItem[]): { label: string; items: NotificationItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: Record<string, NotificationItem[]> = {};
  for (const item of items) {
    const ts = new Date(item.created_at).getTime();
    let key: string;
    if (ts >= today) key = 'Today';
    else if (ts >= yesterday) key = 'Yesterday';
    else if (ts >= weekAgo) key = 'This Week';
    else key = 'Earlier';

    (groups[key] ??= []).push(item);
  }

  const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
  return order.filter((k) => groups[k]?.length).map((k) => ({ label: k, items: groups[k] }));
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; ring: string; label: string }> = {
  submitted: {
    icon: Send,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    ring: 'ring-brand-100',
    label: 'Submitted',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-100',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    ring: 'ring-red-100',
    label: 'Rejected',
  },
  info_requested: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    ring: 'ring-amber-100',
    label: 'Action Required',
  },
  email_sent: {
    icon: MailCheck,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    ring: 'ring-blue-100',
    label: 'Email Sent',
  },
  email_queued: {
    icon: Mail,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    ring: 'ring-slate-100',
    label: 'Email Queued',
  },
};

const DEFAULT_CONFIG = {
  icon: Bell,
  color: 'text-slate-500',
  bg: 'bg-slate-50',
  ring: 'ring-slate-100',
  label: 'Update',
};

const LAST_SEEN_KEY = 'notifications_last_seen';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    return stored ? Number(stored) : 0;
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    refetchInterval: 30_000,
  });

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (n) => !n.is_read && new Date(n.created_at).getTime() > lastSeenAt,
      ).length,
    [notifications, lastSeenAt],
  );

  const isItemUnseen = (item: NotificationItem) =>
    !item.is_read && new Date(item.created_at).getTime() > lastSeenAt;

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    setLastSeenAt(now);
    localStorage.setItem(LAST_SEEN_KEY, String(now));

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleItemClick(item: NotificationItem) {
    setOpen(false);
    if (item.application_id) {
      navigate(`/enrolment/applications/${item.application_id}`);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[9998] bg-black/10"
                onClick={() => setOpen(false)}
              />

              <motion.div
                ref={panelRef}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-sm flex-col border-l border-slate-200/60 bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {unreadCount > 0
                        ? `${unreadCount} new`
                        : notifications.length > 0
                          ? `${notifications.length} total`
                          : 'No notifications'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                        <Inbox className="h-7 w-7 text-slate-300" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-500">No notifications yet</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Updates about your applications will appear here.
                      </p>
                    </div>
                  ) : (
                    grouped.map((group) => (
                      <div key={group.label}>
                        <div className="sticky top-0 z-10 border-b border-slate-50 bg-slate-50/90 px-5 py-1.5 backdrop-blur-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {group.label}
                          </p>
                        </div>
                        {group.items.map((item) => {
                          const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG;
                          const Icon = cfg.icon;
                          const unseen = isItemUnseen(item);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleItemClick(item)}
                              className={cn(
                                'flex w-full items-start gap-3 border-b border-slate-50 px-5 py-3 text-left transition-colors hover:bg-slate-50/80',
                                unseen && 'bg-brand-50/20',
                              )}
                            >
                              <span
                                className={cn(
                                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1',
                                  cfg.bg,
                                  cfg.ring,
                                )}
                              >
                                <Icon className={cn('h-4 w-4', cfg.color)} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                      cfg.bg,
                                      cfg.color,
                                    )}
                                  >
                                    {cfg.label}
                                  </span>
                                  {unseen && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    'mt-1 text-[13px] leading-snug',
                                    unseen
                                      ? 'font-medium text-slate-800'
                                      : 'text-slate-500',
                                  )}
                                >
                                  {item.message}
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{timeAgo(item.created_at)}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
