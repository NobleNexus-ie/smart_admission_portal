import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, GitCompareArrows, X, Plus, Check, GraduationCap, SlidersHorizontal, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSchoolSearch } from '@/hooks/useSchools';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SchoolStatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SCHOOL_BOARDS } from '@/lib/types';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from '@/components/ui/AnimatedPage';

interface SelectedSchool {
  id: string;
  name: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SchoolSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [board, setBoard] = useState('');
  const [area, setArea] = useState('');
  const [name, setName] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [page, setPage] = useState(1);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<SelectedSchool[]>([]);

  const debouncedName = useDebounce(name, 400);
  const debouncedArea = useDebounce(area, 400);

  const prevFiltersRef = useRef({ board, schoolType });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.board !== board || prev.schoolType !== schoolType) {
      setPage(1);
    }
    prevFiltersRef.current = { board, schoolType };
  }, [board, schoolType]);

  useEffect(() => {
    setPage(1);
  }, [debouncedName, debouncedArea]);

  const toggleSelect = (id: string, schoolName: string) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === id)) return prev.filter((s) => s.id !== id);
      if (prev.length >= 4) return prev;
      return [...prev, { id, name: schoolName }];
    });
  };

  const goCompare = () => {
    navigate(`/enrolment/compare?ids=${selected.map((s) => s.id).join(',')}`);
  };

  const { data, isLoading, isFetching } = useSchoolSearch({
    board: board || undefined,
    area: debouncedArea || undefined,
    name: debouncedName || undefined,
    school_type: (schoolType as 'public' | 'private') || undefined,
    page,
    page_size: 20,
  });

  const hasChatbotData = useMemo(() => !!sessionStorage.getItem('chatbot_form_data'), []);
  const selectedIds = new Set(selected.map((s) => s.id));
  const activeFilterCount = [board, schoolType, debouncedArea, debouncedName].filter(Boolean).length;

  const clearFilters = () => {
    setBoard('');
    setSchoolType('');
    setArea('');
    setName('');
    setPage(1);
  };

  return (
    <AnimatedPage className="page-container">
      <FadeIn>
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="section-title">{t('schools.title')}</h1>
                <p className="mt-0.5 text-sm text-slate-500">{t('schools.filtersInstant')}</p>
                <Link
                  to="/enrolment/applications"
                  className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 transition"
                >
                  {t('schools.viewMyApps')} →
                </Link>
              </div>
            </div>
            {!compareMode && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <Button variant="outline" size="sm" onClick={() => setCompareMode(true)}>
                  <GitCompareArrows className="h-4 w-4" />
                  {t('schools.compare')}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </FadeIn>

      {hasChatbotData && (
        <FadeIn>
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-200/60 bg-brand-50/70 px-4 py-3 backdrop-blur-sm">
            <Bot className="h-5 w-5 text-brand-600 shrink-0" />
            <p className="text-sm text-brand-800">
              Your chatbot application data is ready! Select a school below and click <strong>Apply</strong> — the form will be pre-filled automatically.
            </p>
          </div>
        </FadeIn>
      )}

      <AnimatePresence>
        {compareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-2xl border border-brand-200/60 bg-brand-50/50 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand-900">{t('schools.selectToCompare')}</p>
                  <p className="mt-0.5 text-xs text-brand-600">{t('schools.clickPlus')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" disabled={selected.length < 2} onClick={goCompare} className="shadow-glow">
                    <GitCompareArrows className="h-4 w-4" />
                    {t('schools.compare')} {selected.length > 0 ? `(${selected.length})` : ''}
                  </Button>
                  <button
                    onClick={() => { setCompareMode(false); setSelected([]); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {selected.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    {selected.map((s) => (
                      <motion.span
                        key={s.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-800 shadow-sm ring-1 ring-brand-200"
                      >
                        {s.name}
                        <button onClick={() => toggleSelect(s.id, s.name)} className="rounded-full p-0.5 hover:bg-brand-100 transition">
                          <X className="h-3 w-3" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8 lg:flex-row">
        <FadeIn delay={0.15} className="w-full shrink-0 lg:w-64">
          <div className="glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-500" />
                <p className="font-semibold text-slate-800">{t('schools.filtersTitle')}</p>
              </div>
              {activeFilterCount > 0 && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                  {t('schools.clearAll')} ({activeFilterCount})
                </motion.button>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('schools.schoolType')}
              </label>
              <div className="flex gap-1.5">
                {[
                  { value: '', labelKey: 'common.all' },
                  { value: 'public', labelKey: 'schools.public' },
                  { value: 'private', labelKey: 'schools.private' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSchoolType(opt.value)}
                    className={`flex-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all ${
                      schoolType === opt.value
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <Select
              label={t('schools.board')}
              placeholder={t('schools.allBoards')}
              options={SCHOOL_BOARDS.map((b) => ({ value: b, label: b }))}
              value={board}
              onChange={(e) => setBoard(e.target.value)}
            />

            <Input
              label={t('schools.area')}
              placeholder={t('schools.areaPlaceholder')}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />

            <div className="relative">
              <Input
                label={t('schools.schoolName')}
                placeholder={t('schools.searchByName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {isFetching && (name || area) && (
                <div className="absolute right-3 top-8">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-1.5 rounded-lg bg-brand-50/50 p-2"
              >
                {board && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                    {board}
                    <button onClick={() => setBoard('')} className="ml-0.5 rounded-full hover:bg-brand-100 transition"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {schoolType && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                    {schoolType === 'public' ? t('schools.public') : t('schools.private')}
                    <button onClick={() => setSchoolType('')} className="ml-0.5 rounded-full hover:bg-brand-100 transition"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {debouncedArea && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                    {debouncedArea}
                    <button onClick={() => setArea('')} className="ml-0.5 rounded-full hover:bg-brand-100 transition"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {debouncedName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                    &quot;{debouncedName}&quot;
                    <button onClick={() => setName('')} className="ml-0.5 rounded-full hover:bg-brand-100 transition"><X className="h-3 w-3" /></button>
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </FadeIn>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <PageLoader />
          ) : !data?.items?.length ? (
            <FadeIn>
              <EmptyState title={t('schools.noSchools')} description={t('schools.noSchools')} />
            </FadeIn>
          ) : (
            <>
              <FadeIn>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    {t('schools.schoolsFound', { count: data.total })}
                    {isFetching && <span className="ml-2 text-brand-500">{t('schools.updating')}</span>}
                  </p>
                </div>
              </FadeIn>
              <StaggerContainer className="space-y-4">
                {data.items.map((school) => {
                  const accepting = school.status === 'active' && school.accepting_applications !== false;
                  const isSelected = selectedIds.has(school.id);
                  return (
                    <StaggerItem key={school.id}>
                      <ScaleOnHover>
                        <div className={`interactive-card ${compareMode && isSelected ? 'ring-2 ring-brand-400 shadow-glow' : ''}`}>
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <Link
                                to={`/enrolment/schools/${school.id}`}
                                className="font-display text-lg font-semibold text-slate-900 hover:text-brand-600 transition"
                              >
                                {school.name}
                              </Link>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  {school.board}
                                </span>
                                {school.school_type && (
                                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                    school.school_type === 'public'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-violet-50 text-violet-700'
                                  }`}>
                                    {school.school_type === 'public' ? t('schools.public') : t('schools.private')}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3.5 w-3.5" />
                                {[school.area, school.city].filter(Boolean).join(', ')}
                              </p>
                              <div className="mt-2">
                                <SchoolStatusBadge status={school.status} accepting={accepting} />
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {compareMode && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleSelect(school.id, school.name)}
                                  disabled={!isSelected && selected.length >= 4}
                                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                                    isSelected
                                      ? 'border-brand-500 bg-brand-600 text-white shadow-glow'
                                      : selected.length >= 4
                                        ? 'cursor-not-allowed border-slate-200 text-slate-300'
                                        : 'border-slate-300 text-slate-500 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600'
                                  }`}
                                >
                                  {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </motion.button>
                              )}
                              {accepting ? (
                                <Link to={`/enrolment/apply/${school.id}`}>
                                  <Button>{t('schools.applyNow')}</Button>
                                </Link>
                              ) : (
                                <Button disabled variant="secondary">{t('schools.notAccepting')}</Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </ScaleOnHover>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>

              {data.pages > 1 && (
                <FadeIn delay={0.2}>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      {t('common.previous')}
                    </Button>
                    <span className="rounded-lg bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                      {t('common.page')} {data.page} {t('common.of')} {data.pages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                      {t('common.next')}
                    </Button>
                  </div>
                </FadeIn>
              )}
            </>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
