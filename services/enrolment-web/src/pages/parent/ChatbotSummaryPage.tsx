import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DocumentUpload } from '@/components/forms/DocumentUpload';
import { getErrorMessage } from '@/lib/utils';
import { chatbotApi, type ChatSummary, type SchoolResult } from '@/api/chatbot';
import { applicationsApi } from '@/api/applications';
import { useUploadDocument } from '@/hooks/useApplications';
import apiClient from '@/api/client';
import { SCHOOL_BOARDS } from '@/lib/types';

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

const OPTIONAL_FIELDS = new Set([
  'nationality',
  'previous_school_name',
  'previous_board',
  'previous_marks',
  'medical_conditions',
  'special_needs',
]);

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
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [transcripts, setTranscripts] = useState<File | null>(null);
  const [extraDocs, setExtraDocs] = useState<Record<string, File | null>>({});
  const [docError, setDocError] = useState<string | null>(null);

  const [searchName, setSearchName] = useState('');
  const [filterBoard, setFilterBoard] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const uploadDoc = useUploadDocument();

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
          .get<{ items: SchoolResult[]; total: number }>('/schools/search', {
            params: { page_size: 100, include_inactive: true },
          })
          .then((r) => r.data),
      ]);
      setSummary(summaryRes);

      const seen = new Set<string>();
      const deduped: SchoolResult[] = [];
      for (const s of schoolsRes.items ?? []) {
        const normName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normCity = (s.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const key = `${normName}|${normCity}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (s.status === 'active' || s.status === 'inactive') {
          deduped.push(s as SchoolResult);
        }
      }
      setSchools(deduped);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (searchName && !s.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (filterBoard && s.board !== filterBoard) return false;
      if (filterCity && !s.city?.toLowerCase().includes(filterCity.toLowerCase())) return false;
      return true;
    });
  }, [schools, searchName, filterBoard, filterCity]);

  const activeSelected = useMemo(() => {
    return [...selectedSchoolIds].filter((id) => {
      const s = schools.find((sch) => sch.id === id);
      return s?.status === 'active';
    });
  }, [selectedSchoolIds, schools]);

  const EXTRA_DOC_LABELS: Record<string, string> = {
    transfer_certificate: 'Transfer Certificate',
    previous_marksheet: 'Previous Marksheet',
    migration_certificate: 'Migration Certificate',
    character_certificate: 'Character Certificate',
    caste_certificate: 'Caste Certificate',
    income_certificate: 'Income Certificate',
    address_proof: 'Address Proof',
  };

  const schoolExtraDocs = useMemo(() => {
    const docSet = new Set<string>();
    for (const id of activeSelected) {
      const school = schools.find((s) => s.id === id);
      for (const doc of school?.required_documents ?? []) {
        if (doc !== 'birth_cert' && doc !== 'photo' && doc !== 'transcript') {
          docSet.add(doc);
        }
      }
    }
    return [...docSet];
  }, [activeSelected, schools]);

  function toggleSchool(id: string) {
    const school = schools.find((s) => s.id === id);
    if (school?.status !== 'active') return;
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!sessionId || activeSelected.length === 0 || !summary) return;

    if (!birthCert || !photo) {
      setDocError('Birth certificate and photograph are required.');
      return;
    }

    const missingExtra = schoolExtraDocs.filter((d) => !extraDocs[d]);
    if (missingExtra.length > 0) {
      const labels = missingExtra.map(
        (d) => EXTRA_DOC_LABELS[d] || d.replace(/_/g, ' '),
      );
      setDocError(`Required by selected school(s): ${labels.join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setDocError(null);
    try {
      const app = await applicationsApi.create({
        school_id: activeSelected[0],
        form_data: summary.application_data as any,
        method: 'agentic',
      });

      await uploadDoc.mutateAsync({
        id: app.id,
        file: birthCert,
        document_type: 'birth_cert',
      });
      await uploadDoc.mutateAsync({
        id: app.id,
        file: photo,
        document_type: 'photo',
      });
      if (transcripts) {
        await uploadDoc.mutateAsync({
          id: app.id,
          file: transcripts,
          document_type: 'transcript',
        });
      }

      for (const docKey of schoolExtraDocs) {
        const file = extraDocs[docKey];
        if (file) {
          await uploadDoc.mutateAsync({
            id: app.id,
            file,
            document_type: docKey,
          });
        }
      }

      if (activeSelected.length === 1) {
        await applicationsApi.submit(app.id);
      } else {
        await apiClient.post('/applications/submit-multi', {
          application_id: app.id,
          school_ids: activeSelected,
        });
      }

      navigate(`/enrolment/applications/${app.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
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
          Review your details, upload documents, select schools and submit.
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
          <p className="font-medium text-brand-800">
            Application completeness
          </p>
          {summary.missing_mandatory.length > 0 && (
            <p className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Missing required:{' '}
              {summary.missing_mandatory
                .map((f) => FIELD_LABELS[f] || f)
                .join(', ')}
            </p>
          )}
          {summary.missing_optional.length > 0 && (
            <p className="text-slate-500">
              Optional not provided:{' '}
              {summary.missing_optional
                .map((f) => FIELD_LABELS[f] || f)
                .join(', ')}
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
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field}>
                <dt className="text-slate-500">
                  {FIELD_LABELS[field] || field}
                  {OPTIONAL_FIELDS.has(field) && (
                    <span className="ml-1 text-xs text-slate-400">
                      (Optional)
                    </span>
                  )}
                </dt>
                <dd className="font-medium text-slate-900">
                  {summary.application_data[field] || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* Documents */}
      <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold">
          Upload Documents
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Birth certificate and photograph are required to submit your
          application.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <DocumentUpload
            label="Birth Certificate"
            required
            value={birthCert}
            onChange={setBirthCert}
          />
          <DocumentUpload
            label="Recent Photograph"
            required
            accept=".jpg,.jpeg,.png"
            value={photo}
            onChange={setPhoto}
          />
          <DocumentUpload
            label="Previous Transcripts"
            value={transcripts}
            onChange={setTranscripts}
          />
          {schoolExtraDocs.map((docKey) => (
            <DocumentUpload
              key={docKey}
              label={EXTRA_DOC_LABELS[docKey] || docKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              required
              value={extraDocs[docKey] || null}
              onChange={(file) =>
                setExtraDocs((prev) => ({ ...prev, [docKey]: file }))
              }
            />
          ))}
        </div>
        {schoolExtraDocs.length > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            Additional documents required by selected school(s).
          </p>
        )}
        {docError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {docError}
          </p>
        )}
      </section>

      {/* School selection */}
      <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold">
          Select Schools
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose one or more active schools to submit your application to.
          Inactive schools are shown but cannot be selected.
        </p>

        {/* Filters */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          >
            <option value="">All boards</option>
            {SCHOOL_BOARDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by city..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />
        </div>

        {filteredSchools.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No schools match your filters.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {filteredSchools.map((school) => {
              const isActive = school.status === 'active';
              const isSelected = selectedSchoolIds.has(school.id);
              return (
                <label
                  key={school.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                    !isActive
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : isSelected
                        ? 'cursor-pointer border-brand-500 bg-brand-50 ring-1 ring-brand-500/30'
                        : 'cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!isActive}
                    onChange={() => toggleSchool(school.id)}
                    className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {school.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {school.board} · {school.area}, {school.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <div className="text-right">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Inactive
                        </span>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Online applications not yet open
                        </p>
                      </div>
                    )}
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-brand-600" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {activeSelected.length > 0 && (
          <p className="mt-3 text-sm font-medium text-brand-700">
            {activeSelected.length} school{activeSelected.length > 1 ? 's' : ''}{' '}
            selected
          </p>
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
          disabled={
            activeSelected.length === 0 ||
            submitting ||
            summary.missing_mandatory.length > 0
          }
          loading={submitting}
        >
          Submit to {activeSelected.length || '...'} school
          {activeSelected.length !== 1 ? 's' : ''}
        </Button>
        <Button variant="outline" onClick={() => navigate(`/enrolment/chatbot?session_id=${sessionId}`)}>
          Back to chat
        </Button>
      </div>
    </div>
  );
}
