import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { notificationsApi, type NotificationPreference } from '@/api/notifications';
import { getErrorMessage } from '@/lib/utils';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate', description: 'Get notified right away' },
  { value: 'daily', label: 'Daily digest', description: 'One email per day' },
  { value: 'weekly', label: 'Weekly digest', description: 'One email per week' },
];

export function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    setLoading(true);
    try {
      const data = await notificationsApi.getPreferences();
      setPrefs(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await notificationsApi.updatePreferences({
        frequency: prefs.frequency,
        reminders_enabled: prefs.reminders_enabled,
        status_updates_enabled: prefs.status_updates_enabled,
      });
      setPrefs(updated);
      setSuccess(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="page-container">
        <p className="text-red-600">{error || 'Failed to load preferences.'}</p>
      </div>
    );
  }

  return (
    <AnimatedPage className="page-container max-w-2xl space-y-6">
      <FadeIn>
        <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 transition">
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="section-title">Notification Preferences</h1>
            <p className="mt-0.5 text-sm text-slate-500">Choose how and when you receive notifications.</p>
          </div>
        </div>
      </FadeIn>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/50">
          {error}
        </motion.p>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200/50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Preferences saved successfully.
        </motion.div>
      )}

      <FadeIn delay={0.2}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-semibold text-slate-900">Email frequency</h2>
          <p className="mt-1 text-sm text-slate-500">How often do you want email notifications?</p>
          <div className="mt-4 space-y-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <motion.label
                key={opt.value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  prefs.frequency === opt.value
                    ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30 shadow-glow'
                    : 'border-slate-200/60 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={opt.value}
                  checked={prefs.frequency === opt.value}
                  onChange={() => setPrefs({ ...prefs, frequency: opt.value })}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </motion.label>
            ))}
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.3}>
        <section className="glass-card">
          <h2 className="font-display text-lg font-semibold text-slate-900">Notification types</h2>
          <div className="mt-4 divide-y divide-slate-100/60">
            <ToggleRow
              label="Application reminders"
              description="Reminders about draft applications and deadlines"
              checked={prefs.reminders_enabled}
              onChange={(v) => setPrefs({ ...prefs, reminders_enabled: v })}
            />
            <ToggleRow
              label="Status updates"
              description="When your application status changes"
              checked={prefs.status_updates_enabled}
              onChange={(v) => setPrefs({ ...prefs, status_updates_enabled: v })}
            />
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.35}>
        <Button onClick={save} loading={saving} className="shadow-glow">
          Save preferences
        </Button>
      </FadeIn>
    </AnimatedPage>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          checked ? 'bg-brand-600' : 'bg-slate-200'
        }`}
      >
        <motion.span
          layout
          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0"
          style={{ x: checked ? 20 : 0 }}
        />
      </motion.button>
    </div>
  );
}
