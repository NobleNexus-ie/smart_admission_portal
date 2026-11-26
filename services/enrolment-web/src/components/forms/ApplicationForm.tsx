import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Baby, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DocumentUpload } from './DocumentUpload';
import {
  DOCUMENT_TYPES,
  GRADES,
  SCHOOL_BOARDS,
  type ApplicationFormData,
} from '@/lib/types';
import { cn, getErrorMessage } from '@/lib/utils';
import {
  useCreateApplication,
  useSubmitApplication,
  useUploadDocument,
} from '@/hooks/useApplications';
import { childrenApi, type Child } from '@/api/children';

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
  { id: 2, title: 'Academic & Additional' },
  { id: 3, title: 'Documents & Review' },
];

interface ApplicationFormProps {
  schoolId: string;
  schoolName?: string;
}

export function ApplicationForm({ schoolId, schoolName }: ApplicationFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenApi.list,
  });
  const [filledChildName, setFilledChildName] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [transcripts, setTranscripts] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createApp = useCreateApplication();
  const uploadDoc = useUploadDocument();
  const submitApp = useSubmitApplication();

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      nationality: 'Indian',
      previous_marks: null,
    },
    mode: 'onBlur',
  });

  const chatbotApplied = useRef(false);
  useEffect(() => {
    if (chatbotApplied.current) return;
    try {
      const raw = sessionStorage.getItem('chatbot_form_data');
      if (!raw) return;
      chatbotApplied.current = true;
      const data = JSON.parse(raw) as Record<string, string>;
      if (data.student_full_name) setValue('student_full_name', data.student_full_name);
      if (data.date_of_birth) setValue('date_of_birth', data.date_of_birth);
      if (data.gender) setValue('gender', data.gender as 'Male' | 'Female' | 'Other');
      if (data.grade_applying_for) setValue('grade_applying_for', data.grade_applying_for);
      if (data.previous_school_name) setValue('previous_school_name', data.previous_school_name);
      if (data.previous_board) setValue('previous_board', data.previous_board);
      if (data.emergency_contact_name) setValue('emergency_contact_name', data.emergency_contact_name);
      if (data.emergency_contact_phone) setValue('emergency_contact_phone', data.emergency_contact_phone);
      if (data.medical_conditions && data.medical_conditions.toLowerCase() !== 'none') setValue('medical_conditions', data.medical_conditions);
      if (data.special_needs && data.special_needs.toLowerCase() !== 'none') setValue('special_needs', data.special_needs);
    } catch { /* ignore */ }
  }, [setValue]);

  function fillFromChild(child: Child) {
    setFilledChildName(child.full_name);
    setValue('student_full_name', child.full_name);
    if (child.date_of_birth) setValue('date_of_birth', child.date_of_birth);
    if (child.gender) setValue('gender', child.gender as 'Male' | 'Female' | 'Other');
    if (child.nationality) setValue('nationality', child.nationality);
    if (child.previous_school_name) setValue('previous_school_name', child.previous_school_name);
    if (child.previous_board) setValue('previous_board', child.previous_board);
    if (child.previous_marks) {
      const n = Number(child.previous_marks);
      if (!Number.isNaN(n)) setValue('previous_marks', n);
    }
    if (child.special_needs) setValue('special_needs', child.special_needs);
    if (child.medical_conditions) setValue('medical_conditions', child.medical_conditions);
  }

  function clearChildFill() {
    setFilledChildName(null);
    setValue('student_full_name', '');
    setValue('date_of_birth', '');
    setValue('gender', undefined as any);
    setValue('grade_applying_for', '');
    setValue('nationality', 'Indian');
    setValue('previous_school_name', '');
    setValue('previous_board', '');
    setValue('previous_marks', null);
    setValue('special_needs', '');
    setValue('medical_conditions', '');
  }

  const nextStep = async () => {
    const fields =
      step === 1
        ? (['student_full_name', 'date_of_birth', 'gender', 'grade_applying_for'] as const)
        : ([
            'emergency_contact_name',
            'emergency_contact_phone',
          ] as const);
    const ok = await trigger(fields);
    if (ok) setStep((s) => Math.min(3, s + 1));
  };

  const buildFormData = (): ApplicationFormData => {
    const v = getValues();
    return {
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
  };

  const onConfirmSubmit = async () => {
    setDocError(null);
    setSubmitError(null);
    if (!birthCert || !photo) {
      setDocError('Birth certificate and photo are required.');
      setConfirmOpen(false);
      return;
    }
    try {
      const app = await createApp.mutateAsync({
        school_id: schoolId,
        form_data: buildFormData(),
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
      await submitApp.mutateAsync(app.id);
      setConfirmOpen(false);
      navigate(`/enrolment/applications/${app.id}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setConfirmOpen(false);
    }
  };

  const values = getValues();
  const loading =
    createApp.isPending || uploadDoc.isPending || submitApp.isPending;

  return (
    <div className="space-y-8">
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
                step === s.id ? 'font-medium text-slate-900' : 'text-slate-500',
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

      {schoolName && (
        <p className="text-sm text-slate-600">
          Applying to{' '}
          <span className="font-medium text-brand-800">{schoolName}</span>
        </p>
      )}

      <form
        onSubmit={handleSubmit(() => {
          if (!birthCert || !photo) {
            setDocError('Birth certificate and photo are required.');
            return;
          }
          setConfirmOpen(true);
        })}
        className="space-y-6"
      >
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {children && children.length > 0 && (
              <div className="sm:col-span-2 rounded-xl border border-brand-200/60 bg-brand-50/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-800">
                  <Baby className="h-4 w-4" />
                  Auto-fill from saved child
                </div>
                {filledChildName ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
                      {filledChildName}
                      <button
                        type="button"
                        onClick={clearChildFill}
                        className="rounded-full p-0.5 transition hover:bg-brand-200"
                        aria-label="Clear auto-filled data"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                    <span className="text-xs text-slate-500">Auto-filled</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => fillFromChild(child)}
                        className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100 hover:shadow-sm"
                      >
                        {child.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                {[
                  ['Student', values.student_full_name],
                  ['Date of birth', values.date_of_birth],
                  ['Gender', values.gender],
                  ['Grade', values.grade_applying_for],
                  ['Nationality', values.nationality || '—'],
                  ['Previous school', values.previous_school_name || '—'],
                  ['Emergency contact', values.emergency_contact_name],
                  ['Emergency phone', values.emergency_contact_phone],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-900">{v || '—'}</dd>
                  </div>
                ))}
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
            disabled={step === 1 || loading}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button type="submit" loading={loading} variant="accent">
              Submit application
            </Button>
          )}
        </div>
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm submission"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={onConfirmSubmit}>
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
    </div>
  );
}
