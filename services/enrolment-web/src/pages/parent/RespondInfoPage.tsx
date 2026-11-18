import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApplication, useRespondInfo } from '@/hooks/useApplications';
import { PageLoader } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DocumentUpload } from '@/components/forms/DocumentUpload';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';
import { getErrorMessage } from '@/lib/utils';

export function RespondInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: app, isLoading, isError } = useApplication(id);
  const respond = useRespondInfo();

  const openRequest = app?.info_requests?.find((r) => r.status === 'pending');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;
  if (isError || !app) {
    return (
      <div className="page-container">
        <p className="text-red-600">Application not found.</p>
      </div>
    );
  }

  if (!openRequest) {
    return (
      <AnimatedPage className="page-container max-w-xl space-y-4">
        <h1 className="section-title">No open info request</h1>
        <p className="text-sm text-slate-500">
          There is nothing to respond to for this application.
        </p>
        <Link to={`/enrolment/applications/${app.id}`}>
          <Button variant="outline">Back to application</Button>
        </Link>
      </AnimatedPage>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const missingFields = (openRequest.fields || []).filter(
      (f) => !fieldValues[f]?.trim()
    );
    const missingDocs = (openRequest.documents || []).filter(
      (d) => !files[d]
    );

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.map(f => f.replace(/_/g, ' ')).join(', ')}`);
      return;
    }
    if (missingDocs.length > 0) {
      setError(`Please upload: ${missingDocs.map(d => d.replace(/_/g, ' ')).join(', ')}`);
      return;
    }

    try {
      const fileList = Object.values(files).filter(Boolean) as File[];
      await respond.mutateAsync({
        id: app.id,
        payload: {
          info_request_id: openRequest.id,
          field_responses: fieldValues,
          message: message || undefined,
        },
        files: fileList.length ? fileList : undefined,
      });
      navigate(`/enrolment/applications/${app.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AnimatedPage className="page-container max-w-2xl space-y-6">
      <Link
        to={`/enrolment/applications/${app.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>

      <FadeIn delay={0.1}>
        <h1 className="section-title">Respond to info request</h1>
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-sky-50/70 px-4 py-3 ring-1 ring-sky-200/50 backdrop-blur-sm">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <p className="text-sm text-sky-800">{openRequest.message}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <form
          onSubmit={onSubmit}
          className="glass-card space-y-6"
        >
          {openRequest.fields?.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-slate-800">Requested fields</h2>
              {openRequest.fields.map((field) => (
                <Input
                  key={field}
                  label={field.replace(/_/g, ' ')}
                  required
                  value={fieldValues[field] ?? ''}
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                />
              ))}
            </div>
          )}

          {openRequest.documents?.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-slate-800">Requested documents</h2>
              {openRequest.documents.map((docType) => (
                <DocumentUpload
                  key={docType}
                  label={docType.replace(/_/g, ' ')}
                  required
                  value={files[docType] ?? null}
                  onChange={(file) =>
                    setFiles((prev) => ({ ...prev, [docType]: file }))
                  }
                />
              ))}
            </div>
          )}

          <div>
            <label className="field-label">Message (optional)</label>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm shadow-sm backdrop-blur-sm placeholder:text-slate-400 transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/50"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" loading={respond.isPending} className="shadow-glow">
            Submit response
          </Button>
        </form>
      </FadeIn>
    </AnimatedPage>
  );
}
