import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboard } from '@/hooks/useProfile';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from '@/components/ui/AnimatedPage';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

const STATS = [
  { key: 'total' as const, i18n: 'dashboard.totalApplications', icon: ClipboardList, gradient: 'from-brand-500 to-brand-600' },
  { key: 'pending' as const, i18n: 'dashboard.pending', icon: Clock, gradient: 'from-amber-400 to-amber-500' },
  { key: 'approved' as const, i18n: 'dashboard.approved', icon: CheckCircle2, gradient: 'from-emerald-400 to-emerald-500' },
  { key: 'rejected' as const, i18n: 'dashboard.rejected', icon: XCircle, gradient: 'from-red-400 to-red-500' },
  { key: 'info_requested' as const, i18n: 'dashboard.infoRequested', icon: AlertCircle, gradient: 'from-sky-400 to-sky-500' },
];

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return (
      <div className="page-container">
        <p className="text-red-600">{t('dashboard.loadError')}</p>
      </div>
    );
  }

  const empty = data.total === 0;

  return (
    <AnimatedPage className="page-container space-y-8">
      <FadeIn>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            <Sparkles className="h-7 w-7 text-brand-500" />
          </motion.div>
          <div>
            <h1 className="section-title">{t('nav.dashboard')}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{t('dashboard.welcome')}</p>
          </div>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STATS.map(({ key, i18n, icon: Icon, gradient }) => {
          const filterParam = key === 'total' ? '' : `?status=${key}`;
          return (
          <StaggerItem key={key}>
            <ScaleOnHover>
              <Link to={`/enrolment/applications${filterParam}`} className="block">
              <div className="stat-card cursor-pointer transition-shadow hover:shadow-card">
                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{t(i18n)}</p>
                  <div className={`rounded-xl bg-gradient-to-br ${gradient} p-2 shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="relative z-10 mt-3">
                  <AnimatedNumber value={data[key]} className="font-display text-3xl font-bold text-slate-900" />
                </div>
              </div>
              </Link>
            </ScaleOnHover>
          </StaggerItem>
          );
        })}
      </StaggerContainer>

      <FadeIn delay={0.3}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/enrolment/chatbot">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="interactive-card flex items-center gap-4 !p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-glow">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-slate-900">{t('dashboard.startAssistant')}</p>
                <p className="mt-0.5 text-sm text-slate-500">{t('dashboard.startAssistantDesc')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </motion.div>
          </Link>
          <Link to="/enrolment">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="interactive-card flex items-center gap-4 !p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-slate-900">{t('dashboard.browseApply')}</p>
                <p className="mt-0.5 text-sm text-slate-500">{t('dashboard.browseApplyDesc')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </motion.div>
          </Link>
        </div>
      </FadeIn>

      {empty ? (
        <FadeIn delay={0.4}>
          <EmptyState
            title={t('dashboard.noApplications')}
            description={t('dashboard.noAppsDesc')}
            action={null}
          />
        </FadeIn>
      ) : (
        <FadeIn delay={0.4}>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="glass-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">Application Updates</h2>
                {(data.action_required?.length ?? 0) > 0 && (
                  <Badge variant="warning">{data.action_required.length}</Badge>
                )}
              </div>
              {!data.action_required?.length ? (
                <p className="text-sm text-slate-500">{t('dashboard.nothingNeeded')}</p>
              ) : (
                <ul className="space-y-3">
                  {data.action_required.map((app: any, i: number) => {
                    const linkTo = app.status === 'info_requested'
                      ? `/enrolment/applications/${app.id}/respond-info`
                      : `/enrolment/applications`;
                    return (
                    <motion.li
                      key={`${app.id}-${app.school_id}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <Link
                        to={linkTo}
                        className="interactive-card flex items-center justify-between !p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{app.student_full_name}</p>
                          <p className="text-xs text-slate-500">{app.school_name}</p>
                        </div>
                        <StatusBadge status={app.status} />
                      </Link>
                    </motion.li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="glass-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">{t('dashboard.recentActivity')}</h2>
                <Link to="/enrolment/applications" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition">
                  {t('dashboard.viewAll')}
                </Link>
              </div>
              {!data.recent_activity?.length ? (
                <p className="text-sm text-slate-500">{t('dashboard.noRecentActivity')}</p>
              ) : (
                <ul className="space-y-3">
                  {data.recent_activity.slice(0, 5).map((item, i) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="border-b border-slate-100/80 pb-3 last:border-0 last:pb-0"
                    >
                      <p className="text-sm text-slate-700">{item.message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </FadeIn>
      )}
    </AnimatedPage>
  );
}
