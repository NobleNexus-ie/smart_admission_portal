import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApplications } from '@/hooks/useApplications';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from '@/components/ui/AnimatedPage';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'info_requested', label: 'Info Requested' },
];

export function ApplicationListPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useApplications();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') || '';

  const apps = data ?? [];

  const filteredApps = useMemo(() => {
    if (!statusFilter) return apps;
    return apps.filter((app) => {
      const schoolStatus = app.schools?.[0]?.status;
      const displayStatus = schoolStatus || app.status;
      return displayStatus === statusFilter;
    });
  }, [apps, statusFilter]);

  if (isLoading) return <PageLoader />;
  if (isError) {
    return (
      <div className="page-container">
        <p className="text-red-600">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <AnimatedPage className="page-container space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="section-title">{t('applications.title')}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{t('applications.trackStatus')}</p>
            </div>
          </div>
          <Link to="/enrolment">
            <Button variant="outline">{t('applications.findSchools')}</Button>
          </Link>
        </div>
      </FadeIn>

      {/* Status filter tabs */}
      <FadeIn delay={0.1}>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            const count = tab.key
              ? apps.filter((app) => {
                  const s = app.schools?.[0]?.status || app.status;
                  return s === tab.key;
                }).length
              : apps.length;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key) {
                    setParams({ status: tab.key });
                  } else {
                    setParams({});
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </FadeIn>

      {!filteredApps.length ? (
        <FadeIn delay={0.2}>
          {apps.length === 0 ? (
            <EmptyState
              title={t('applications.noApplications')}
              description={t('applications.trackStatus')}
              action={
                <Link to="/enrolment">
                  <Button>{t('applications.startEnrolment')}</Button>
                </Link>
              }
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
              <p className="text-sm text-slate-500">
                No {statusFilter.replace('_', ' ')} applications found.
              </p>
              <button
                onClick={() => setParams({})}
                className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all applications
              </button>
            </div>
          )}
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-3">
          {filteredApps.map((app) => {
            const schoolStatus = app.schools?.[0]?.status;
            const displayStatus = schoolStatus || app.status;
            const needsAction =
              displayStatus === 'info_requested' ||
              app.info_requests?.some((r) => r.status === 'pending');
            return (
              <StaggerItem key={app.id}>
                <ScaleOnHover>
                  <Link
                    to={`/enrolment/applications/${app.id}`}
                    className="interactive-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {app.form_data?.student_full_name || 'Application'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {app.school_name || app.schools?.[0]?.school_name || 'School'}{' '}
                        · {t('applications.submittedAt')} {formatDate(app.submitted_at || app.created_at)}
                      </p>
                      {displayStatus === 'rejected' && app.schools?.[0]?.reason && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-1 text-xs text-red-600"
                        >
                          {t('staff.reason')}: {app.schools[0].reason}
                        </motion.p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {needsAction && <Badge variant="warning">{t('dashboard.actionRequired')}</Badge>}
                      <StatusBadge status={displayStatus} />
                    </div>
                  </Link>
                </ScaleOnHover>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </AnimatedPage>
  );
}
