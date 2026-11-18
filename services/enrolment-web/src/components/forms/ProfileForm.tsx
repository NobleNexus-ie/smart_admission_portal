import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DocumentUpload } from './DocumentUpload';
import { ID_PROOF_TYPES, type ParentProfile } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { LANGUAGES } from '@/lib/i18n';

const QUALIFICATIONS = [
  { value: 'below_10th', label: 'Below 10th' },
  { value: '10th_pass', label: '10th Pass' },
  { value: '12th_pass', label: '12th Pass' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'post_graduate', label: 'Post Graduate' },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'other', label: 'Other' },
];

const INCOME_RANGES = [
  { value: 'below_2l', label: 'Below 2 Lakhs' },
  { value: '2l_5l', label: '2 - 5 Lakhs' },
  { value: '5l_10l', label: '5 - 10 Lakhs' },
  { value: '10l_20l', label: '10 - 20 Lakhs' },
  { value: '20l_50l', label: '20 - 50 Lakhs' },
  { value: 'above_50l', label: 'Above 50 Lakhs' },
];

const LANG_OPTIONS = LANGUAGES.map((l) => ({
  value: l.code,
  label: `${l.nativeLabel} (${l.label})`,
}));

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  address: z.string().max(500).optional().or(z.literal('')),
  address_line_2: z.string().max(500).optional().or(z.literal('')),
  landmark: z.string().max(200).optional().or(z.literal('')),
  pincode: z
    .string()
    .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode')
    .optional()
    .or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  id_proof_type: z.enum(['aadhaar', 'passport', 'dl', 'voter_id'], {
    required_error: 'Select ID proof type',
  }),
  spouse_name: z.string().max(100).optional().or(z.literal('')),
  spouse_phone: z.string().max(15).optional().or(z.literal('')),
  spouse_email: z.string().email().optional().or(z.literal('')),
  spouse_occupation: z.string().max(100).optional().or(z.literal('')),
  education_qualification: z.string().optional().or(z.literal('')),
  occupation: z.string().max(100).optional().or(z.literal('')),
  annual_income: z.string().optional().or(z.literal('')),
  language_preference: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface ProfileFormProps {
  profile?: ParentProfile;
}

function completionPercent(profile?: ParentProfile, hasFile?: boolean): number {
  if (!profile) return 0;
  const checks = [
    !!profile.full_name,
    !!profile.phone,
    !!profile.address,
    !!profile.city,
    !!profile.state,
    !!profile.pincode,
    !!profile.id_proof_type,
    !!(profile.id_proof_url || hasFile),
    !!profile.spouse_name,
    !!profile.education_qualification,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const { updateProfile, uploadIdProof } = useProfile();
  const [idFile, setIdFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      address_line_2: profile?.address_line_2 ?? '',
      landmark: profile?.landmark ?? '',
      pincode: profile?.pincode ?? '',
      city: profile?.city ?? '',
      state: profile?.state ?? '',
      country: profile?.country ?? 'India',
      id_proof_type: profile?.id_proof_type ?? undefined,
      spouse_name: profile?.spouse_name ?? '',
      spouse_phone: profile?.spouse_phone ?? '',
      spouse_email: profile?.spouse_email ?? '',
      spouse_occupation: profile?.spouse_occupation ?? '',
      education_qualification: profile?.education_qualification ?? '',
      occupation: profile?.occupation ?? '',
      annual_income: profile?.annual_income ?? '',
      language_preference: profile?.language_preference ?? '',
    },
  });

  const percent = completionPercent(profile, !!idFile || !!profile?.id_proof_url);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    setSuccess(false);
    try {
      await updateProfile.mutateAsync({
        full_name: values.full_name,
        phone: values.phone,
        address: values.address || undefined,
        address_line_2: values.address_line_2 || undefined,
        landmark: values.landmark || undefined,
        pincode: values.pincode || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        country: values.country || undefined,
        id_proof_type: values.id_proof_type,
        spouse_name: values.spouse_name || undefined,
        spouse_phone: values.spouse_phone || undefined,
        spouse_email: values.spouse_email || undefined,
        spouse_occupation: values.spouse_occupation || undefined,
        education_qualification: values.education_qualification || undefined,
        occupation: values.occupation || undefined,
        annual_income: values.annual_income || undefined,
        language_preference: (values.language_preference as 'en' | 'hi' | 'ta' | 'bn') || undefined,
      });
      if (idFile) {
        await uploadIdProof.mutateAsync(idFile);
        setIdFile(null);
      }
      setSuccess(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Completion bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Profile completion</span>
          <span className="text-brand-700">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        {!profile?.profile_complete && (
          <p className="mt-2 text-xs text-amber-700">
            Complete your profile to start applying to schools.
          </p>
        )}
      </div>

      {/* Personal Info */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">
          Personal Information
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            required
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label="Phone"
            required
            placeholder="10-digit mobile"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Select
            label="Language preference"
            placeholder="Select language"
            options={LANG_OPTIONS}
            error={errors.language_preference?.message}
            {...register('language_preference')}
          />
        </div>
      </fieldset>

      {/* Address */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">
          Address
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Address line 1"
              error={errors.address?.message}
              {...register('address')}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Address line 2"
              error={errors.address_line_2?.message}
              {...register('address_line_2')}
            />
          </div>
          <Input
            label="Landmark"
            error={errors.landmark?.message}
            {...register('landmark')}
          />
          <Input
            label="Pincode"
            placeholder="6-digit pincode"
            error={errors.pincode?.message}
            {...register('pincode')}
          />
          <Input label="City" error={errors.city?.message} {...register('city')} />
          <Input
            label="State"
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="Country"
            error={errors.country?.message}
            {...register('country')}
          />
        </div>
      </fieldset>

      {/* ID Proof */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">
          Identity Proof
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="ID proof type"
            required
            placeholder="Select type"
            options={ID_PROOF_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            error={errors.id_proof_type?.message}
            {...register('id_proof_type')}
          />
          <DocumentUpload
            label="ID proof file"
            required
            value={idFile}
            existingUrl={profile?.id_proof_url}
            onChange={setIdFile}
          />
        </div>
      </fieldset>

      {/* Spouse Details */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">
          Spouse Details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Spouse name"
            error={errors.spouse_name?.message}
            {...register('spouse_name')}
          />
          <Input
            label="Spouse phone"
            error={errors.spouse_phone?.message}
            {...register('spouse_phone')}
          />
          <Input
            label="Spouse email"
            type="email"
            error={errors.spouse_email?.message}
            {...register('spouse_email')}
          />
          <Input
            label="Spouse occupation"
            error={errors.spouse_occupation?.message}
            {...register('spouse_occupation')}
          />
        </div>
      </fieldset>

      {/* Education & Income */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-700">
          Education & Income
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Highest qualification"
            placeholder="Select"
            options={QUALIFICATIONS}
            error={errors.education_qualification?.message}
            {...register('education_qualification')}
          />
          <Input
            label="Occupation"
            error={errors.occupation?.message}
            {...register('occupation')}
          />
          <Select
            label="Annual income"
            placeholder="Select range"
            options={INCOME_RANGES}
            error={errors.annual_income?.message}
            {...register('annual_income')}
          />
        </div>
      </fieldset>

      {formError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Profile saved successfully.
        </p>
      )}

      <Button
        type="submit"
        loading={updateProfile.isPending || uploadIdProof.isPending}
      >
        Save profile
      </Button>
    </form>
  );
}
