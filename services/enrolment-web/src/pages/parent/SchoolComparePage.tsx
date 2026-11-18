import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, GitCompareArrows } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/api/client';
import type { School } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

export function SchoolComparePage() {
  const [params] = useSearchParams();
  const ids = params.get('ids')?.split(',').filter(Boolean) ?? [];

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) {
      setLoading(false);
      return;
    }
    loadSchools();
  }, []);

  async function loadSchools() {
    setLoading(true);
    try {
      const { data } = await apiClient.get<School[]>('/schools/compare', {
        params: { ids: ids.join(',') },
      });
      setSchools(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!ids.length) {
    return (
      <div className="page-container">
        <p className="text-slate-600">
          No schools selected. Go to{' '}
          <Link to="/enrolment" className="text-brand-600 hover:text-brand-700 transition font-medium">
            school search
          </Link>{' '}
          and select schools to compare.
        </p>
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

  if (error) {
    return (
      <div className="page-container">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const ROWS: { label: string; accessor: (s: School) => string }[] = [
    { label: 'Board', accessor: (s) => s.board },
    { label: 'Area', accessor: (s) => s.area },
    { label: 'City', accessor: (s) => s.city },
    { label: 'Contact email', accessor: (s) => s.contact_email },
    { label: 'Phone', accessor: (s) => s.phone },
    { label: 'Facilities', accessor: (s) => s.facilities?.join(', ') || 'Not listed' },
    { label: 'Accepting', accessor: (s) => (s.accepting_applications ? 'Yes' : 'No') },
    { label: 'Requirements', accessor: (s) => s.application_requirements || 'None specified' },
  ];

  return (
    <AnimatedPage className="page-container space-y-6">
      <FadeIn>
        <Link to="/enrolment" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 transition">
          <ArrowLeft className="h-4 w-4" />
          Back to schools
        </Link>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
            <GitCompareArrows className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="section-title">Compare Schools</h1>
            <p className="mt-0.5 text-sm text-slate-500">Side-by-side comparison of {schools.length} schools</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/80 shadow-card backdrop-blur-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/60">
                <th className="px-5 py-4 text-left font-medium text-slate-500">Feature</th>
                {schools.map((s) => (
                  <th key={s.id} className="px-5 py-4 text-left">
                    <Link to={`/enrolment/schools/${s.id}`} className="font-display font-semibold text-brand-600 hover:text-brand-700 transition">
                      {s.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <motion.tr
                  key={row.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                  className="border-b border-slate-100/60 last:border-0 hover:bg-brand-50/30 transition"
                >
                  <td className="px-5 py-3.5 font-medium text-slate-600">{row.label}</td>
                  {schools.map((s) => (
                    <td key={s.id} className="px-5 py-3.5 text-slate-800">{row.accessor(s)}</td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </FadeIn>
    </AnimatedPage>
  );
}
