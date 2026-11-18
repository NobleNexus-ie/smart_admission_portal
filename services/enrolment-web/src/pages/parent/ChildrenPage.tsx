import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Baby, X, Calendar, School, Heart, GraduationCap, Dna, Globe, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { childrenApi, type Child, type ChildPayload } from '@/api/children';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageLoader } from '@/components/ui/Spinner';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';
import { getErrorMessage } from '@/lib/utils';
import { GRADES, SCHOOL_BOARDS } from '@/lib/types';

const childSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  blood_group: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  mother_tongue: z.string().optional().or(z.literal('')),
  previous_school_name: z.string().optional().or(z.literal('')),
  previous_board: z.string().optional().or(z.literal('')),
  previous_grade: z.string().optional().or(z.literal('')),
  previous_marks: z.string().optional().or(z.literal('')),
  special_needs: z.string().optional().or(z.literal('')),
  medical_conditions: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
});

type ChildFormValues = z.infer<typeof childSchema>;

const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
  (v) => ({ value: v, label: v }),
);

const CARD_GRADIENTS = [
  'from-brand-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
];

function getAge(dob: string): string {
  const birth = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return `${years} yrs`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ChildrenPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: children, isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: childrenApi.list,
  });

  const createMutation = useMutation({
    mutationFn: childrenApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      closeForm();
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChildPayload }) =>
      childrenApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      closeForm();
    },
    onError: (e) => setFormError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: childrenApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      setDeleteId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
  });

  function openAdd() {
    setEditingChild(null);
    reset({
      full_name: '', date_of_birth: '', gender: '', blood_group: '',
      nationality: 'Indian', mother_tongue: '', previous_school_name: '',
      previous_board: '', previous_grade: '', previous_marks: '',
      special_needs: '', medical_conditions: '', allergies: '',
    });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(child: Child) {
    setEditingChild(child);
    reset({
      full_name: child.full_name,
      date_of_birth: child.date_of_birth ?? '',
      gender: child.gender ?? '',
      blood_group: child.blood_group ?? '',
      nationality: child.nationality ?? 'Indian',
      mother_tongue: child.mother_tongue ?? '',
      previous_school_name: child.previous_school_name ?? '',
      previous_board: child.previous_board ?? '',
      previous_grade: child.previous_grade ?? '',
      previous_marks: child.previous_marks ?? '',
      special_needs: child.special_needs ?? '',
      medical_conditions: child.medical_conditions ?? '',
      allergies: child.allergies ?? '',
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingChild(null);
    setFormError(null);
  }

  function onSubmit(values: ChildFormValues) {
    const payload: ChildPayload = {
      full_name: values.full_name,
      date_of_birth: values.date_of_birth || undefined,
      gender: values.gender || undefined,
      blood_group: values.blood_group || undefined,
      nationality: values.nationality || undefined,
      mother_tongue: values.mother_tongue || undefined,
      previous_school_name: values.previous_school_name || undefined,
      previous_board: values.previous_board || undefined,
      previous_grade: values.previous_grade || undefined,
      previous_marks: values.previous_marks || undefined,
      special_needs: values.special_needs || undefined,
      medical_conditions: values.medical_conditions || undefined,
      allergies: values.allergies || undefined,
    };
    if (editingChild) {
      updateMutation.mutate({ id: editingChild.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  if (isLoading) return <PageLoader />;

  return (
    <AnimatedPage className="page-container max-w-4xl space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
              <Baby className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">{t('children.title')}</h1>
              <p className="text-sm text-slate-500">{t('children.twins')}</p>
            </div>
          </div>
          <Button onClick={openAdd} className="gap-1.5 shadow-glow">
            <Plus className="h-4 w-4" />
            {t('children.addChild')}
          </Button>
        </div>
      </FadeIn>

      {/* Empty state */}
      {(!children || children.length === 0) && !showForm && (
        <FadeIn delay={0.1}>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-brand-300/50 bg-gradient-to-br from-brand-50/50 via-white to-violet-50/50 px-8 py-16 text-center">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/40 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-violet-100/40 blur-2xl" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow"
            >
              <Baby className="h-10 w-10 text-white" />
            </motion.div>
            <h3 className="relative font-display text-xl font-bold text-slate-800">
              {t('children.noChildren')}
            </h3>
            <p className="relative mt-2 mx-auto max-w-md text-sm text-slate-500">
              {t('children.addChildDesc')}
            </p>
            <Button onClick={openAdd} size="lg" className="relative mt-6 gap-2 shadow-glow">
              <Plus className="h-4 w-4" />
              {t('children.addFirstChild')}
            </Button>
          </div>
        </FadeIn>
      )}

      {/* Child Cards — rich animated design */}
      <div className="grid gap-5 sm:grid-cols-2">
        <AnimatePresence>
          {children?.map((child, i) => {
            const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-card transition-shadow hover:shadow-elevated"
              >
                {/* Top gradient banner */}
                <div className={`relative h-24 bg-gradient-to-br ${gradient} p-4`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                  <div className="absolute -bottom-6 -right-4 h-20 w-20 rounded-full bg-white/10 blur-lg" />

                  {/* Action buttons */}
                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => openEdit(child)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => setDeleteId(child.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm transition hover:bg-red-400/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>

                  {/* Avatar */}
                  <div className="absolute -bottom-7 left-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-slate-700 to-slate-900 text-lg font-bold text-white shadow-lg">
                      {getInitials(child.full_name)}
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-5 pb-5 pt-10">
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {child.full_name}
                  </h3>

                  {/* Info chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {child.date_of_birth && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {child.date_of_birth} ({getAge(child.date_of_birth)})
                      </span>
                    )}
                    {child.gender && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                        {child.gender}
                      </span>
                    )}
                    {child.blood_group && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        <Heart className="h-3 w-3" />
                        {child.blood_group}
                      </span>
                    )}
                    {child.nationality && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <Globe className="h-3 w-3" />
                        {child.nationality}
                      </span>
                    )}
                  </div>

                  {/* Academic info */}
                  {(child.previous_school_name || child.previous_grade || child.previous_board) && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <GraduationCap className="h-3 w-3" />
                        {t('children.previousAcademics')}
                      </p>
                      <div className="space-y-1 text-xs text-slate-600">
                        {child.previous_school_name && (
                          <div className="flex items-center gap-1.5">
                            <School className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="font-medium">{child.previous_school_name}</span>
                          </div>
                        )}
                        <div className="flex gap-3">
                          {child.previous_grade && (
                            <span className="text-slate-500">{t('children.grade')}: <span className="font-semibold text-slate-700">{child.previous_grade}</span></span>
                          )}
                          {child.previous_board && (
                            <span className="text-slate-500">{t('children.board')}: <span className="font-semibold text-slate-700">{child.previous_board}</span></span>
                          )}
                          {child.previous_marks && (
                            <span className="text-slate-500">{t('children.marks')}: <span className="font-semibold text-slate-700">{child.previous_marks}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Health info */}
                  {(child.medical_conditions || child.special_needs || child.allergies) && (
                    <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        <Dna className="h-3 w-3" />
                        {t('children.healthNeeds')}
                      </p>
                      <div className="space-y-0.5 text-xs text-amber-800">
                        {child.medical_conditions && <p>{child.medical_conditions}</p>}
                        {child.special_needs && <p>{child.special_needs}</p>}
                        {child.allergies && <p>{t('children.allergies')}: {child.allergies}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="mx-4 w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-center font-display text-lg font-bold text-slate-800">
                {t('children.deleteConfirm')}
              </h3>
              <p className="mt-2 text-center text-sm text-slate-500">
                {t('children.cannotUndo')}
              </p>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteId(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  loading={deleteMutation.isPending}
                  onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                >
                  {t('children.deleteChild')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-elevated"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-brand-50 to-violet-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-sm">
                  <Baby className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editingChild ? t('children.editChild') : t('children.addChild')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                  <User className="h-3.5 w-3.5" /> {t('children.basicInfo')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label={t('children.fullName')} required error={errors.full_name?.message} {...register('full_name')} />
                  <Input label={t('children.dateOfBirth')} type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
                  <Select label={t('children.gender')} placeholder={t('common.select')} options={GENDERS} error={errors.gender?.message} {...register('gender')} />
                  <Select label={t('children.bloodGroup')} placeholder={t('common.select')} options={BLOOD_GROUPS} error={errors.blood_group?.message} {...register('blood_group')} />
                  <Input label={t('children.nationality')} error={errors.nationality?.message} {...register('nationality')} />
                  <Input label={t('children.motherTongue')} error={errors.mother_tongue?.message} {...register('mother_tongue')} />
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                  <GraduationCap className="h-3.5 w-3.5" /> {t('children.previousAcademics')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label={t('children.previousSchool')} error={errors.previous_school_name?.message} {...register('previous_school_name')} />
                  <Select label={t('children.previousBoard')} placeholder={t('common.select')} options={SCHOOL_BOARDS.map((b) => ({ value: b, label: b }))} error={errors.previous_board?.message} {...register('previous_board')} />
                  <Select label={t('children.previousGrade')} placeholder={t('common.select')} options={GRADES.map((g) => ({ value: g, label: g }))} error={errors.previous_grade?.message} {...register('previous_grade')} />
                  <Input label={t('children.previousMarks')} error={errors.previous_marks?.message} {...register('previous_marks')} />
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
                  <Heart className="h-3.5 w-3.5" /> {t('children.healthNeeds')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label={t('children.specialNeeds')} error={errors.special_needs?.message} {...register('special_needs')} />
                  <Input label={t('children.medicalConditions')} error={errors.medical_conditions?.message} {...register('medical_conditions')} />
                  <Input label={t('children.allergies')} error={errors.allergies?.message} {...register('allergies')} />
                </div>
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" type="button" onClick={closeForm}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="shadow-glow"
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingChild ? t('children.editChild') : t('children.addChild')}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}
