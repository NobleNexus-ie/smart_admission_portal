import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';
import { chatbotApi, type ChatSummary } from '@/api/chatbot';
import { applicationsApi } from '@/api/applications';
import apiClient from '@/api/client';
import type { School } from '@/lib/types';

const FIELD_LABELS: Record<string, string> = {
  student_full_name: 'Full name',
  date_of_birth: 'Date of birth',
  gender: 'Gender',
  nationality: 'Nationality',
  grade_applying_for: 'Grade applying for',
  previous_school_name: 'Previous school',
  previous_board: 'Previous board',
  previous_marks: 'Previous marks',
  emergency_contact_name: 'Emergency contact',
  emergency_contact_phone: 'Emergency phone',
  medical_conditions: 'Medical conditions',
  special_needs: 'Special needs',
};

const SECTIONS = [
  {
    title: 'Student Details',
    fields: ['student_full_name', 'date_of_birth', 'gender', 'nationality'],
  },
  {
    title: 'Academic History',
    fields: [
      'grade_applying_for',
      'previous_school_name',
      'previous_board',
      'previous_marks',
    ],
  },
  {
    title: 'Additional Information',
    fields: [
      'emergency_contact_name',
      'emergency_contact_phone',
      'medical_conditions',
      'special_needs',
    ],
  },
];

export function ChatbotSummaryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    loadData();
  }, [sessionId]);

  async function loadData() {
    setLoading(true);
    try {
      const [summaryRes, schoolsRes] = await Promise.all([
        chatbotApi.getSummary(sessionId!),
        apiClient
          .get<{ items: School[]; total: number }>('/schools/search', {
            params: { page_size: 50 },
          })
          .then((r) => r.data),
      ]);
      setSummary(summaryRes);
      setSchools(
        (schoolsRes.items ?? []).filter(
          (s: School) => s.status === 'active',
        ),
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!sessionId || !selectedSchoolId || !summary) return;
    setSubmitting(true);
    setError(null);
    try {
      const app = await applicationsApi.create({
        school_id: selectedSchoolId,
        form_data: summary.application_data as any,
      });
      await applicationsApi.submit(app.id);
      navigate(`/enrolment/applications/${app.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSwitchToForm() {
    if (!summary) return;
    sessionStorage.setItem('chatbot_form_data', JSON.stringify(summary.application_data));
    navigate('/enrolment');
  }

  if (!sessionId) {
    return (
      <div className="page-container">
        <p className="text-red-600">No session specified.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page-container">
        <p className="text-red-600">{error || 'Failed to load summary.'}</p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl space-y-6">
      <Link
        to="/enrolment/chatbot"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to chat
      </Link>

      <div>
        <h1 className="section-title">Application Summary</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review your application details below. Select a school and submit.
        </p>
      </div>

      {/* Completeness */}
      <div className="flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100">
          <span className="text-sm font-bold text-brand-700">
            {summary.completeness}%
          </span>
        </div>
        <div className="text-sm">
          <p className="font-medium text-brand-800">Application completeness</p>
          {summary.missing_fields.length > 0 && (
            <p className="text-brand-600">
              Missing: {summary.missing_fields.map((f) => FIELD_LABELS[f] || f).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {section.title}
            </h2>
            <button
              onClick={handleSwitchToForm}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              <Pencil className="h-3 w-3" /> Edit in form
            </button>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field}>
                <dt className="text-slate-500">
                  {FIELD_LABELS[field] || field}
                </dt>
                <dd className="font-medium text-slate-900">
                  {summary.application_data[field] || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* School selection */}
      <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold">
          Select a school
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose which school to submit your application to.
        </p>
        {schools.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No active schools available.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {schools.map((school) => (
              <label
                key={school.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  selectedSchoolId === school.id
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="school"
                  value={school.id}
                  checked={selectedSchoolId === school.id}
                  onChange={() => setSelectedSchoolId(school.id)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {school.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {school.board} &middot; {school.area}, {school.city}
                  </p>
                </div>
                {selectedSchoolId === school.id && (
                  <CheckCircle className="h-5 w-5 text-brand-600" />
                )}
              </label>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!selectedSchoolId || submitting || summary.missing_fields.length > 0}
          loading={submitting}
        >
          Submit application
        </Button>
        <Button variant="outline" onClick={handleSwitchToForm}>
          Edit in form instead
        </Button>
      </div>
    </div>
  );
}
