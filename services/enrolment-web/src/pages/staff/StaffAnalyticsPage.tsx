import { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle2, XCircle, Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { analyticsApi, type StaffAnalytics } from '@/api/analytics';
import { getErrorMessage } from '@/lib/utils';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from '@/components/ui/AnimatedPage';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ProgressRing } from '@/components/ui/ProgressRing';

export function StaffAnalyticsPage() {
  const [data, setData] = useState<StaffAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await analyticsApi.getStaffAnalytics();
      setData(res);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <p className="text-red-600">{error || 'Failed to load analytics.'}</p>
      </div>
    );
  }

  const STATS = [
    { label: 'Total applications', value: data.total, icon: Users, gradient: 'from-brand-500 to-brand-600' },
    { label: 'Pending review', value: data.pending, icon: Clock, gradient: 'from-amber-400 to-amber-500' },
    { label: 'Approved', value: data.approved, icon: CheckCircle2, gradient: 'from-emerald-400 to-emerald-500' },
    { label: 'Rejected', value: data.rejected, icon: XCircle, gradient: 'from-red-400 to-red-500' },
  ];

  return (
    <AnimatedPage className="page-container space-y-8">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="section-title">Analytics</h1>
            <p className="mt-0.5 text-sm text-slate-500">Overview of application metrics for your school</p>
          </div>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, gradient }) => (
          <StaggerItem key={label}>
            <ScaleOnHover>
              <div className="stat-card">
                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <div className={`rounded-xl bg-gradient-to-br ${gradient} p-2 shadow-sm`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="relative z-10 mt-3">
                  <AnimatedNumber value={value} className="font-display text-3xl font-bold text-slate-900" />
                </div>
              </div>
            </ScaleOnHover>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeIn delay={0.3}>
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="glass-card flex items-center gap-6">
            <ProgressRing value={data.approval_rate * 100} label="Approval" />
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">Approval rate</h2>
              <p className="mt-1 text-sm text-slate-500">
                Based on {data.total} total applications
              </p>
            </div>
          </section>
          <section className="glass-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-500" />
              <h2 className="font-display text-lg font-semibold text-slate-900">Avg. review time</h2>
            </div>
            <p className="mt-3 font-display text-4xl font-bold gradient-text">
              {data.avg_response_time_hours ? `${data.avg_response_time_hours.toFixed(1)}h` : 'N/A'}
            </p>
            <p className="mt-1 text-sm text-slate-500">Average time to process an application</p>
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={0.35}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-semibold text-slate-900">Applications by grade</h2>
          {Object.keys(data.applications_by_grade).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No data available.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {Object.entries(data.applications_by_grade)
                .sort((a, b) => b[1] - a[1])
                .map(([grade, count], i) => {
                  const max = Math.max(...Object.values(data.applications_by_grade));
                  const pct = max > 0 ? (count / max) * 100 : 0;
                  return (
                    <motion.div
                      key={grade}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{grade}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                      <div className="progress-bar mt-1">
                        <motion.div
                          className="progress-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </section>
      </FadeIn>

      {data.applications_over_time.length > 0 && (
        <FadeIn delay={0.4}>
          <section className="glass-card">
            <h2 className="font-display text-lg font-semibold text-slate-900">Recent applications (30 days)</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {data.applications_over_time.slice(-10).map((d, i) => (
                <motion.div
                  key={d.date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.04 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="rounded-xl bg-gradient-to-br from-brand-50/80 to-white p-3 text-center ring-1 ring-slate-200/60"
                >
                  <p className="text-xs text-slate-500">{d.date}</p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900">{d.count}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </FadeIn>
      )}
    </AnimatedPage>
  );
}
