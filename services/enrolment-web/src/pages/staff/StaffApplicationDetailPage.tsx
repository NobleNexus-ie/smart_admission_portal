import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, XCircle, MessageSquare, Sparkles, Mail, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStaffApplication, useStaffActions } from '@/hooks/useApplications';
import { PageLoader } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';
import { formatDate, formatDateTime, getErrorMessage } from '@/lib/utils';
import { authenticatedUrl } from '@/lib/auth';
import apiClient from '@/api/client';

type ActionType = 'approve' | 'reject' | 'request_info' | null;

const REJECTION_REASONS = [
  { value: '', label: 'Select a reason...' },
  { value: 'age_criteria', label: 'Does not meet age criteria' },
  { value: 'seats_full', label: 'No seats available for the requested grade' },
  { value: 'incomplete_documents', label: 'Incomplete or invalid documents' },
  { value: 'academic_requirements', label: 'Does not meet academic requirements' },
  { value: 'residential_criteria', label: 'Does not meet residential/zone criteria' },
  { value: 'duplicate_application', label: 'Duplicate application' },
  { value: 'late_submission', label: 'Application submitted after deadline' },
  { value: 'other', label: 'Other (specify below)' },
];

async function improveText(text: string, context: string): Promise<{ improved_text: string; used_ai: boolean }> {
  const res = await apiClient.post<{ improved_text: string; used_ai: boolean }>('/ai/improve-text', { text, context });
  return res.data;
}

export function StaffApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: app, isLoading, isError } = useStaffApplication(id);
  const { approve, reject, requestInfo } = useStaffActions();

  const [action, setAction] = useState<ActionType>(null);
  const [notes, setNotes] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState('');
  const [reason, setReason] = useState('');
  const [infoSubject, setInfoSubject] = useState('Additional Information Required');
  const [infoMessage, setInfoMessage] = useState('');
  const [infoFields, setInfoFields] = useState<string[]>([]);
  const [infoDocs, setInfoDocs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [showPrevRequest, setShowPrevRequest] = useState(false);

  if (isLoading) return <PageLoader />;
  if (isError || !app) {
    return (
      <div className="page-container">
        <p className="text-red-600">Application not found.</p>
      </div>
    );
  }

  const fd = app.form_data;
  const canAct = app.status === 'pending' || app.status === 'info_requested';
  const pendingInfoRequests = (app.info_requests || []).filter((ir) => ir.status === 'pending');
  const hasPendingRequest = pendingInfoRequests.length > 0;
  const lastPendingRequest = hasPendingRequest ? pendingInfoRequests[pendingInfoRequests.length - 1] : null;

  const REQUESTABLE_FIELDS = [
    'emergency_contact_name',
    'emergency_contact_phone',
    'previous_school_name',
    'previous_marks',
    'medical_conditions',
    'special_needs',
  ];
  const REQUESTABLE_DOCS = ['birth_cert', 'photo', 'transcripts', 'medical_records'];

  function toggleItem(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function handleApprove() {
    if (!app) return;
    setError(null);
    try {
      await approve.mutateAsync({ id: app.id, payload: { notes: notes || undefined } });
      navigate('/staff/applications');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleReject() {
    if (!app) return;
    setError(null);
    if (!rejectionCategory) {
      setError('Please select a rejection reason.');
      return;
    }
    const categoryLabel = REJECTION_REASONS.find(r => r.value === rejectionCategory)?.label || '';
    const fullReason = reason.trim()
      ? `${categoryLabel}: ${reason.trim()}`
      : categoryLabel;
    try {
      await reject.mutateAsync({ id: app.id, payload: { reason: fullReason } });
      navigate('/staff/applications');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleRequestInfo() {
    if (!app) return;
    setError(null);
    if (!infoMessage.trim()) {
      setError('Please compose a message to the parent.');
      return;
    }
    if (!infoFields.length && !infoDocs.length) {
      setError('Select at least one field or document to request.');
      return;
    }
    const fullMessage = infoSubject ? `Subject: ${infoSubject}\n\n${infoMessage}` : infoMessage;
    try {
      await requestInfo.mutateAsync({
        id: app.id,
        payload: { fields_requested: infoFields, documents_requested: infoDocs, message: fullMessage },
      });
      navigate('/staff/applications');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleImproveText(
    text: string,
    setter: (v: string) => void,
    context: 'info_request' | 'rejection',
  ) {
    if (!text.trim()) return;
    setImproving(true);
    try {
      const result = await improveText(text, context);
      setter(result.improved_text);
    } catch {
      // silently fail — user keeps their original text
    } finally {
      setImproving(false);
    }
  }

  function closeModal() {
    setAction(null);
    setError(null);
    setNotes('');
    setRejectionCategory('');
    setReason('');
    setInfoSubject('Additional Information Required');
    setInfoMessage('');
    setInfoFields([]);
    setInfoDocs([]);
    setShowPrevRequest(false);
  }

  return (
    <AnimatedPage className="page-container max-w-4xl space-y-6">
      <Link
        to="/staff/applications"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        All applications
      </Link>

      <FadeIn delay={0.1}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="section-title">
              {fd?.student_full_name || 'Application'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Submitted {formatDateTime(app.submitted_at)}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </FadeIn>

      {canAct && (
        <FadeIn delay={0.15}>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setAction('approve')} className="shadow-glow">
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
            <Button variant="danger" onClick={() => setAction('reject')}>
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button variant="outline" onClick={() => {
              setInfoSubject(hasPendingRequest ? 'Follow-up: Additional Information Required' : 'Additional Information Required');
              setAction('request_info');
            }}>
              <MessageSquare className="h-4 w-4" />
              {hasPendingRequest ? 'Follow up' : 'Request info'}
            </Button>
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-bold">Student details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['Full name', fd?.student_full_name],
              ['Date of birth', formatDate(fd?.date_of_birth)],
              ['Gender', fd?.gender],
              ['Grade applying', fd?.grade_applying_for],
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

      <FadeIn delay={0.25}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-bold">Documents</h2>
          {!app.documents?.length ? (
            <p className="mt-2 text-sm text-slate-500">No documents uploaded.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {app.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <FileText className="h-4 w-4 text-brand-500" />
                  <span className="font-medium">{doc.category}</span>
                  <span className="text-slate-300">·</span>
                  <a
                    href={authenticatedUrl(doc.download_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:text-brand-700 transition"
                  >
                    {doc.file_name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </FadeIn>

      {app.info_requests && app.info_requests.length > 0 && (
        <FadeIn delay={0.3}>
          <section className="glass-card">
            <h2 className="font-display text-lg font-bold">Info request history</h2>
            <ul className="mt-4 space-y-4">
              {app.info_requests.map((req) => (
                <li key={req.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={req.status === 'pending' ? 'info' : 'neutral'} dot>
                      {req.status}
                    </Badge>
                    <span className="text-slate-400">{formatDateTime(req.created_at)}</span>
                    {req.responded_at && (
                      <span className="text-slate-400">
                        Responded {formatDateTime(req.responded_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-700">{req.message}</p>
                  {req.fields.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Fields: {req.fields.join(', ')}
                    </p>
                  )}
                  {req.documents.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Documents: {req.documents.join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </FadeIn>
      )}

      <Modal
        open={action === 'approve'}
        onClose={closeModal}
        title="Approve application"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleApprove} loading={approve.isPending} className="shadow-glow">
              Confirm approve
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Approve <strong>{fd?.student_full_name}</strong> for{' '}
          <strong>{fd?.grade_applying_for}</strong>?
        </p>
        <div className="mt-4">
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for the parent..."
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}
      </Modal>

      <Modal
        open={action === 'reject'}
        onClose={closeModal}
        title="Reject application"
        className="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={reject.isPending}>
              Confirm reject
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Reject <strong>{fd?.student_full_name}</strong>? The parent will see the reason you provide.
        </p>
        <div className="mt-4 space-y-4">
          <Select
            label="Rejection reason"
            required
            value={rejectionCategory}
            onChange={(e) => setRejectionCategory(e.target.value)}
            options={REJECTION_REASONS.filter(r => r.value).map(r => ({ value: r.value, label: r.label }))}
            placeholder="Select a reason..."
          />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="field-label">Additional details</label>
              <button
                type="button"
                disabled={!reason.trim() || improving}
                onClick={() => handleImproveText(reason, setReason, 'rejection')}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3" />
                {improving ? 'Improving...' : 'Improve with AI'}
              </button>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide additional context for the parent (optional)..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}
      </Modal>

      <Modal
        open={action === 'request_info'}
        onClose={closeModal}
        title=""
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Discard</Button>
            <Button onClick={handleRequestInfo} loading={requestInfo.isPending} className="gap-1.5 shadow-glow">
              <Mail className="h-3.5 w-3.5" />
              {hasPendingRequest ? 'Send follow-up' : 'Send to parent'}
            </Button>
          </>
        }
      >
        <div className="space-y-0">
          {/* Warning banner for follow-up requests */}
          {hasPendingRequest && lastPendingRequest && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    A request was already sent to the parent
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600">
                    Sent on {formatDateTime(lastPendingRequest.created_at)} and is still awaiting response. This will be sent as a follow-up request.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPrevRequest(!showPrevRequest)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 transition hover:text-amber-900"
                  >
                    {showPrevRequest ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showPrevRequest ? 'Hide previous request' : 'View previous request'}
                  </button>
                  {showPrevRequest && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 rounded-lg border border-amber-200 bg-white/70 p-2.5 text-xs text-slate-600"
                    >
                      {lastPendingRequest.fields.length > 0 && (
                        <div className="mb-1.5">
                          <span className="font-medium text-slate-500">Fields:</span>{' '}
                          {lastPendingRequest.fields.map((f: string) => f.replace(/_/g, ' ')).join(', ')}
                        </div>
                      )}
                      {lastPendingRequest.documents.length > 0 && (
                        <div className="mb-1.5">
                          <span className="font-medium text-slate-500">Documents:</span>{' '}
                          {lastPendingRequest.documents.map((d: string) => d.replace(/_/g, ' ')).join(', ')}
                        </div>
                      )}
                      {lastPendingRequest.message && (
                        <div>
                          <span className="font-medium text-slate-500">Message:</span>
                          <p className="mt-0.5 whitespace-pre-wrap text-slate-600">{lastPendingRequest.message}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Email-style header */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-sm">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {hasPendingRequest ? 'Follow-up Request' : 'Request Information'}
              </p>
              <p className="text-xs text-slate-400">To: {fd?.student_full_name}&apos;s parent</p>
            </div>
          </div>

          {/* Subject line */}
          <div className="flex items-center gap-2 border-b border-slate-100 py-2">
            <span className="text-xs font-medium text-slate-400 w-14 shrink-0">Subject:</span>
            <input
              value={infoSubject}
              onChange={(e) => setInfoSubject(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-300"
              placeholder="Subject line..."
            />
          </div>

          {/* Attachments / tags area */}
          <div className="border-b border-slate-100 py-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Request fields</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUESTABLE_FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleItem(infoFields, f, setInfoFields)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      infoFields.includes(f)
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Request documents</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUESTABLE_DOCS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleItem(infoDocs, d, setInfoDocs)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      infoDocs.includes(d)
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="mr-1 inline h-3 w-3" />
                    {d.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compose area */}
          <div className="pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Message</span>
              <button
                type="button"
                disabled={!infoMessage.trim() || improving}
                onClick={() => handleImproveText(infoMessage, setInfoMessage, 'info_request')}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 hover:shadow-sm disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3" />
                {improving ? 'Improving...' : 'Improve with AI'}
              </button>
            </div>
            <textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="Dear Parent,&#10;&#10;We are reviewing your child's application and require the following additional information...&#10;&#10;Best regards,&#10;Admissions Team"
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 placeholder:text-slate-300"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-red-600"
            >
              {error}
            </motion.p>
          )}
        </div>
      </Modal>
    </AnimatedPage>
  );
}
