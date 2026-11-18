import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { useStaffApplications } from '@/hooks/useApplications';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { ApplicationStatus } from '@/lib/types';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'info_requested', label: 'Info Requested' },
];

export function StaffApplicationListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, isLoading, isError } = useStaffApplications(statusFilter);

  if (isLoading) return <PageLoader />;
  if (isError) {
    return (
      <div className="page-container">
        <p className="text-red-600">Could not load applications.</p>
      </div>
    );
  }

  const apps = data ?? [];

  const counts: Record<string, number> = { all: apps.length };
  for (const app of apps) {
    counts[app.status] = (counts[app.status] ?? 0) + 1;
  }

  return (
    <AnimatedPage className="page-container space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="section-title">Applications</h1>
            <p className="mt-0.5 text-sm text-slate-500">Review and take action on applications to your school</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <motion.button
              key={f.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                statusFilter === f.value
                  ? 'gradient-bg text-white shadow-glow'
                  : 'bg-white/80 text-slate-600 ring-1 ring-slate-200/60 hover:bg-slate-50 hover:ring-slate-300'
              }`}
            >
              {f.label}
              {counts[f.value] != null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    statusFilter === f.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {counts[f.value]}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </FadeIn>

      {!apps.length ? (
        <FadeIn delay={0.2}>
          <EmptyState
            title="No applications"
            description={
              statusFilter === 'all'
                ? 'No applications have been submitted to your school yet.'
                : `No ${statusFilter.replace('_', ' ')} applications.`
            }
          />
        </FadeIn>
      ) : (
        <FadeIn delay={0.2}>
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-card backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100/60 text-left">
                  <th className="px-5 py-4 font-medium text-slate-500">Student</th>
                  <th className="hidden px-5 py-4 font-medium text-slate-500 sm:table-cell">Grade</th>
                  <th className="hidden px-5 py-4 font-medium text-slate-500 md:table-cell">Submitted</th>
                  <th className="px-5 py-4 font-medium text-slate-500">Status</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {apps.map((app, i) => {
                  const needsAction = app.status === ('pending' as ApplicationStatus);
                  return (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      className="hover:bg-brand-50/30 transition"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {app.form_data?.student_full_name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {app.form_data?.emergency_contact_name || ''}
                        </p>
                      </td>
                      <td className="hidden px-5 py-4 text-slate-700 sm:table-cell">
                        {app.form_data?.grade_applying_for || '—'}
                      </td>
                      <td className="hidden px-5 py-4 text-slate-500 md:table-cell">
                        {formatDate(app.submitted_at || app.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={app.status} />
                          {needsAction && <Badge variant="warning">New</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/staff/applications/${app.id}`}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 transition"
                        >
                          Review
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
    </AnimatedPage>
  );
}
