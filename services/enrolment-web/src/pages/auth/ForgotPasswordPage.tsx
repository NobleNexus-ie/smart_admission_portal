import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth';
import { getErrorMessage } from '@/lib/utils';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(values.email);
      setSubmitted(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-100/50 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-purple-100/40 blur-3xl" />
      </div>
      <AnimatedPage className="relative w-full max-w-md">
        <FadeIn>
          <Link to="/" className="font-display text-xl font-bold gradient-text">
            VedaAcademy Enrolment
          </Link>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Reset password</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </FadeIn>

        {submitted ? (
          <FadeIn delay={0.15}>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="mt-8 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-6 text-center backdrop-blur-sm"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-emerald-800">
                If an account exists with that email, you&apos;ll receive a password reset link shortly.
              </p>
            </motion.div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
              {error && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/50"
                >
                  {error}
                </motion.p>
              )}
              <Button type="submit" className="w-full shadow-glow" loading={loading}>
                Send reset link
              </Button>
            </form>
          </FadeIn>
        )}

        <FadeIn delay={0.3}>
          <p className="mt-6 text-center text-sm text-slate-500">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 transition">
              Sign in
            </Link>
          </p>
        </FadeIn>
      </AnimatedPage>
    </div>
  );
}
