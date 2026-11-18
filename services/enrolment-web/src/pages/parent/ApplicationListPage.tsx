import { Link } from 'react-router-dom';
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

export function ApplicationListPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useApplications();

  if (isLoading) return <PageLoader />;
  if (isError) {
    return (
      <div className="page-container">
        <p className="text-red-600">{t('common.error')}</p>
      </div>
    );
  }

  const apps = data ?? [];

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

      {!apps.length ? (
        <FadeIn delay={0.2}>
          <EmptyState
            title={t('applications.noApplications')}
            description={t('applications.trackStatus')}
            action={
              <Link to="/enrolment">
                <Button>{t('applications.startEnrolment')}</Button>
              </Link>
            }
          />
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-3">
          {apps.map((app) => {
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
