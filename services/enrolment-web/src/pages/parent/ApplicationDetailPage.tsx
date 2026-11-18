import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApplication } from '@/hooks/useApplications';
import { PageLoader } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatDateTime } from '@/lib/utils';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedPage';
import { authenticatedUrl } from '@/lib/auth';

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading, isError } = useApplication(id);

  if (isLoading) return <PageLoader />;
  if (isError || !app) {
    return (
      <div className="page-container">
        <p className="text-red-600">Application not found.</p>
      </div>
    );
  }

  const openInfo = app.info_requests?.find((r) => r.status === 'pending');
  const fd = app.form_data;

  return (
    <AnimatedPage className="page-container max-w-3xl space-y-6">
      <FadeIn>
        <Link
          to="/enrolment/applications"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          All applications
        </Link>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="section-title">{fd?.student_full_name || 'Application'}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {app.school_name || 'School'} · Submitted {formatDateTime(app.submitted_at)}
              </p>
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </FadeIn>

      {openInfo && (
        <FadeIn delay={0.15}>
          <motion.div
            initial={{ scale: 0.97 }}
            animate={{ scale: 1 }}
            className="rounded-2xl border border-sky-200/60 bg-sky-50/70 p-5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-sky-600" />
              <div>
                <p className="font-semibold text-sky-900">Additional information requested</p>
                <p className="mt-1 text-sm text-sky-700">{openInfo.message}</p>
                <Link to={`/enrolment/applications/${app.id}/respond-info`} className="mt-3 inline-block">
                  <Button size="sm" className="shadow-glow">Respond now</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-semibold text-slate-900">Student details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {([
              ['Full name', fd?.student_full_name],
              ['Date of birth', formatDate(fd?.date_of_birth)],
              ['Gender', fd?.gender],
              ['Grade', fd?.grade_applying_for],
              ['Nationality', fd?.nationality],
              ['Previous school', fd?.previous_school_name],
              ['Previous board', fd?.previous_board],
              ['Previous marks', fd?.previous_marks?.toString()],
              ['Emergency contact', fd?.emergency_contact_name],
              ['Emergency phone', fd?.emergency_contact_phone],
              ['Special needs', fd?.special_needs],
              ['Medical conditions', fd?.medical_conditions],
            ] as [string, string | undefined][]).map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-medium text-slate-800">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
      </FadeIn>

      <FadeIn delay={0.3}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-semibold text-slate-900">Documents</h2>
          {!app.documents?.length ? (
            <p className="mt-2 text-sm text-slate-500">No documents uploaded.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {app.documents.map((doc) => (
                <motion.li
                  key={doc.id}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <FileText className="h-4 w-4 text-brand-500" />
                  <span className="font-medium">{doc.category}</span>
                  <span className="text-slate-300">·</span>
                  <a href={authenticatedUrl(doc.download_url)} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700 transition">
                    {doc.file_name}
                  </a>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </FadeIn>

      {app.schools?.length > 0 && (
        <FadeIn delay={0.35}>
          <section className="glass-card">
            <h2 className="font-display text-lg font-semibold text-slate-900">Per-school status</h2>
            <StaggerContainer className="mt-4 space-y-3">
              {app.schools.map((s: any) => (
                <StaggerItem key={s.id}>
                  <div className="border-b border-slate-100/60 pb-3 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{s.school_name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.status === 'rejected' && s.reason && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 flex items-start gap-2 rounded-xl bg-red-50/80 px-4 py-3"
                      >
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div>
                          <p className="text-xs font-semibold text-red-800">Reason for rejection</p>
                          <p className="mt-0.5 text-sm text-red-700">{s.reason}</p>
                        </div>
                      </motion.div>
                    )}
                    {s.status === 'approved' && s.notes && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50/80 px-4 py-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <p className="text-sm text-emerald-700">{s.notes}</p>
                      </motion.div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </FadeIn>
      )}

      {app.info_requests?.length > 0 && (
        <FadeIn delay={0.4}>
          <section className="glass-card">
            <h2 className="font-display text-lg font-semibold text-slate-900">Info requests</h2>
            <ul className="mt-4 space-y-4">
              {app.info_requests.map((req) => (
                <motion.li key={req.id} whileHover={{ x: 2 }} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={req.status === 'pending' ? 'info' : 'neutral'}>{req.status}</Badge>
                    <span className="text-slate-400">{formatDateTime(req.created_at)}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{req.message}</p>
                </motion.li>
              ))}
            </ul>
          </section>
        </FadeIn>
      )}
    </AnimatedPage>
  );
}
