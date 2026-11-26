import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Search,
  School as SchoolIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DocumentUpload } from '@/components/forms/DocumentUpload';
import { PageLoader } from '@/components/ui/Spinner';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';
import { GRADES, SCHOOL_BOARDS, DOCUMENT_TYPES } from '@/lib/types';
import { cn, getErrorMessage } from '@/lib/utils';
import { schoolsApi } from '@/api/schools';
import { applicationsApi } from '@/api/applications';
import { chatbotApi } from '@/api/chatbot';
import apiClient from '@/api/client';

const step1Schema = z.object({
  student_full_name: z.string().min(2, 'Required').max(100),
  date_of_birth: z.string().min(1, 'Required'),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Required' }),
  grade_applying_for: z.string().min(1, 'Required'),
  nationality: z.string().optional().or(z.literal('')),
});

const step2Schema = z.object({
  previous_school_name: z.string().optional().or(z.literal('')),
  previous_board: z.string().optional().or(z.literal('')),
  previous_marks: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === '' || v === undefined || v === null) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    }),
  emergency_contact_name: z.string().min(2, 'Required'),
  emergency_contact_phone: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Valid Indian mobile required'),
  special_needs: z.string().optional().or(z.literal('')),
  medical_conditions: z.string().optional().or(z.literal('')),
});

const fullSchema = step1Schema.merge(step2Schema);
type FormValues = z.infer<typeof fullSchema>;

const STEPS = [
  { id: 1, title: 'Student' },
  { id: 2, title: 'Academic & Contact' },
  { id: 3, title: 'Schools' },
  { id: 4, title: 'Documents & Submit' },
];

export function ContinueFromChatPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlSessionId = params.get('session_id');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!urlSessionId);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(
    new Set(),
  );
  const [alreadyAppliedSchoolIds, setAlreadyAppliedSchoolIds] = useState<Set<string>>(
    new Set(),
  );
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolFilterBoard, setSchoolFilterBoard] = useState('');

  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [transcripts, setTranscripts] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: { nationality: 'Indian', previous_marks: null },
    mode: 'onBlur',
  });

  function applyFormData(data: Record<string, string>) {
    const skip = new Set(['None', 'No', 'none', 'no', '']);
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      if (!value || skip.has(value)) continue;
      if (key === 'previous_marks') {
        const n = Number(value);
        if (!Number.isNaN(n)) setValue('previous_marks', n);
      } else {
        setValue(key as any, value);
      }
    }
  }

  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    if (urlSessionId) {
      chatbotApi
        .switchToForm(urlSessionId)
        .then((res) => {
          sessionStorage.setItem('chatbot_form_data', JSON.stringify(res.form_data));
          sessionStorage.setItem('chatbot_session_id', res.session_id);
          applyFormData(res.form_data);
          setLoading(false);
        })
        .catch(() => {
          navigate('/enrolment/chatbot');
        });
      return;
    }

    try {
      const raw = sessionStorage.getItem('chatbot_form_data');
      if (!raw) {
        navigate('/enrolment/chatbot');
        return;
      }
      const data = JSON.parse(raw) as Record<string, string>;
      applyFormData(data);
    } catch {
      navigate('/enrolment/chatbot');
    }
  }, [setValue, navigate, urlSessionId]);

  const { data: existingApps } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.list,
  });

  useEffect(() => {
    if (!existingApps) return;
    const studentName = (getValues('student_full_name') || '').trim().toLowerCase();
    if (!studentName) return;
    const appliedIds = new Set<string>();
    for (const app of existingApps) {
      if (
        (app.form_data?.student_full_name || '').trim().toLowerCase() === studentName
      ) {
        if (app.school_id) appliedIds.add(app.school_id);
        for (const s of app.schools ?? []) {
          appliedIds.add(s.school_id);
        }
      }
    }
    setAlreadyAppliedSchoolIds(appliedIds);
  }, [existingApps, step]);

  const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
    queryKey: ['schools', 'search', 'all'],
    queryFn: () => schoolsApi.search({ page: 1, page_size: 200 }),
    enabled: step >= 3,
  });

  const allSchools = schoolsData?.items ?? [];

  const filteredSchools = useMemo(() => {
    return allSchools.filter((s) => {
      if (s.status !== 'active') return false;
      if (
        schoolSearch &&
        !s.name.toLowerCase().includes(schoolSearch.toLowerCase())
      )
        return false;
      if (schoolFilterBoard && s.board !== schoolFilterBoard) return false;
      return true;
    });
  }, [allSchools, schoolSearch, schoolFilterBoard]);

  const selectedCount = selectedSchoolIds.size;

  function toggleSchool(id: string) {
    if (alreadyAppliedSchoolIds.has(id)) return;
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nextStep = async () => {
    if (step === 1) {
      const ok = await trigger([
        'student_full_name',
        'date_of_birth',
        'gender',
        'grade_applying_for',
      ]);
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await trigger([
        'emergency_contact_name',
        'emergency_contact_phone',
      ]);
      if (ok) setStep(3);
    } else if (step === 3) {
      if (selectedCount === 0) return;
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    setDocError(null);
    setSubmitError(null);
    if (!birthCert || !photo) {
      setDocError('Birth certificate and photograph are required.');
      setConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      const v = getValues();
      const formData = {
        student_full_name: v.student_full_name,
        date_of_birth: v.date_of_birth,
        gender: v.gender,
        grade_applying_for: v.grade_applying_for,
        nationality: v.nationality || undefined,
        previous_school_name: v.previous_school_name || undefined,
        previous_board: v.previous_board || undefined,
        previous_marks: v.previous_marks ?? null,
        emergency_contact_name: v.emergency_contact_name,
        emergency_contact_phone: v.emergency_contact_phone,
        special_needs: v.special_needs || undefined,
        medical_conditions: v.medical_conditions || undefined,
      };

      const schoolIds = [...selectedSchoolIds];
      const app = await applicationsApi.create({
        school_id: schoolIds[0],
        form_data: formData,
        method: 'chatbot',
      });

      await applicationsApi.uploadDocument(app.id, birthCert, 'birth_cert');
      await applicationsApi.uploadDocument(app.id, photo, 'photo');
      if (transcripts) {
        await applicationsApi.uploadDocument(app.id, transcripts, 'transcript');
      }

      if (schoolIds.length === 1) {
        await applicationsApi.submit(app.id);
      } else {
        await apiClient.post('/applications/submit-multi', {
          application_id: app.id,
          school_ids: schoolIds,
        });
      }

      sessionStorage.removeItem('chatbot_form_data');
      sessionStorage.removeItem('chatbot_session_id');
      setConfirmOpen(false);
      navigate(`/enrolment/applications/${app.id}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const values = getValues();

  if (loading) return <PageLoader />;

  return (
    <AnimatedPage className="page-container max-w-3xl space-y-6">
      <Link
        to="/enrolment/chatbot"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to chat
      </Link>

      <FadeIn>
        <h1 className="section-title">Complete Your Application</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your details from the chat have been prefilled. Review, complete any
          missing fields, select schools, and submit.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  step > s.id
                    ? 'bg-brand-700 text-white'
                    : step === s.id
                      ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-600'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={cn(
                  'hidden text-sm sm:inline',
                  step === s.id
                    ? 'font-medium text-slate-900'
                    : 'text-slate-500',
                )}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && (
                <div className="mx-2 hidden h-px flex-1 bg-slate-200 sm:block" />
              )}
            </div>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="glass-card space-y-6">
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Student full name"
                  required
                  error={errors.student_full_name?.message}
                  {...register('student_full_name')}
                />
              </div>
              <Input
                label="Date of birth"
                type="date"
                required
                error={errors.date_of_birth?.message}
                {...register('date_of_birth')}
              />
              <Select
                label="Gender"
                required
                placeholder="Select"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                error={errors.gender?.message}
                {...register('gender')}
              />
              <Select
                label="Grade applying for"
                required
                placeholder="Select grade"
                options={GRADES.map((g) => ({ value: g, label: g }))}
                error={errors.grade_applying_for?.message}
                {...register('grade_applying_for')}
              />
              <Input
                label="Nationality"
                error={errors.nationality?.message}
                {...register('nationality')}
              />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Previous school name"
                {...register('previous_school_name')}
              />
              <Select
                label="Previous board"
                placeholder="Select board"
                options={SCHOOL_BOARDS.map((b) => ({ value: b, label: b }))}
                {...register('previous_board')}
              />
              <Input
                label="Previous marks (%)"
                type="number"
                min={0}
                max={100}
                step={0.01}
                {...register('previous_marks')}
              />
              <div />
              <Input
                label="Emergency contact name"
                required
                error={errors.emergency_contact_name?.message}
                {...register('emergency_contact_name')}
              />
              <Input
                label="Emergency contact phone"
                required
                error={errors.emergency_contact_phone?.message}
                {...register('emergency_contact_phone')}
              />
              <div className="sm:col-span-2">
                <label className="field-label">Special needs</label>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  {...register('special_needs')}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Medical conditions</label>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  {...register('medical_conditions')}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <SchoolIcon className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">
                  Select Schools to Apply
                </p>
              </div>

              {alreadyAppliedSchoolIds.size > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <p className="text-xs text-purple-700">
                    You've already applied to {alreadyAppliedSchoolIds.size} school{alreadyAppliedSchoolIds.size > 1 ? 's' : ''} for this student.
                    Those are marked as "Already applied" and cannot be selected again.
                  </p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                  />
                </div>
                <select
                  value={schoolFilterBoard}
                  onChange={(e) => setSchoolFilterBoard(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                >
                  <option value="">All boards</option>
                  {SCHOOL_BOARDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {schoolsLoading ? (
                <PageLoader />
              ) : filteredSchools.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  No active schools found.
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {filteredSchools.map((school) => {
                    const isSelected = selectedSchoolIds.has(school.id);
                    const isAlreadyApplied = alreadyAppliedSchoolIds.has(school.id);
                    return (
                      <label
                        key={school.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                          isAlreadyApplied
                            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                            : isSelected
                              ? 'cursor-pointer border-brand-500 bg-brand-50 ring-1 ring-brand-500/30'
                              : 'cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAlreadyApplied}
                          onChange={() => toggleSchool(school.id)}
                          className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-900">
                            {school.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {school.board} &middot; {school.area}, {school.city}
                          </p>
                        </div>
                        {isAlreadyApplied ? (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                            Already applied
                          </span>
                        ) : isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-brand-600" />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedCount > 0 && (
                <p className="text-xs font-medium text-brand-700">
                  {selectedCount} school{selectedCount > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DocumentUpload
                  label={DOCUMENT_TYPES[0].label}
                  required
                  value={birthCert}
                  onChange={setBirthCert}
                />
                <DocumentUpload
                  label={DOCUMENT_TYPES[1].label}
                  required
                  value={photo}
                  onChange={setPhoto}
                />
                <DocumentUpload
                  label={DOCUMENT_TYPES[2].label}
                  value={transcripts}
                  onChange={setTranscripts}
                />
              </div>
              {docError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {docError}
                </p>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Review
                </h3>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {(
                    [
                      ['Student', values.student_full_name],
                      ['Date of birth', values.date_of_birth],
                      ['Gender', values.gender],
                      ['Grade', values.grade_applying_for],
                      ['Nationality', values.nationality || '—'],
                      [
                        'Previous school',
                        values.previous_school_name || '—',
                      ],
                      ['Emergency contact', values.emergency_contact_name],
                      [
                        'Emergency phone',
                        values.emergency_contact_phone,
                      ],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-medium text-slate-900">
                        {v || '—'}
                      </dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Schools</dt>
                    <dd className="font-medium text-slate-900">
                      {[...selectedSchoolIds]
                        .map((id) => {
                          const s = allSchools.find((sch) => sch.id === id);
                          return s?.name ?? id;
                        })
                        .join(', ')}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || submitting}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={step === 3 && selectedCount === 0}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="accent"
                loading={submitting}
                onClick={() => {
                  if (!birthCert || !photo) {
                    setDocError(
                      'Birth certificate and photograph are required.',
                    );
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                Submit to {selectedCount} school
                {selectedCount !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </FadeIn>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm submission"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmit}>
              Confirm & submit
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Once submitted, you cannot edit this application unless the school
          requests more information. Continue?
        </p>
      </Modal>
    </AnimatedPage>
  );
}
