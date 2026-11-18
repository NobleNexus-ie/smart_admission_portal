import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth';
import { getErrorMessage, passwordSchemaCheck } from '@/lib/utils';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
  .refine((d) => passwordSchemaCheck(d.password).valid, {
    message: 'Password must include an uppercase letter and a number',
    path: ['password'],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <AnimatedPage className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-slate-700">Invalid or missing reset token. Please request a new password reset.</p>
          <Link to="/forgot-password" className="mt-4 inline-block font-medium text-brand-600 hover:text-brand-700 transition">
            Request new link
          </Link>
        </AnimatedPage>
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token!, values.password);
      navigate('/login', {
        state: { message: 'Password reset successfully. Please sign in with your new password.' },
      });
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
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900">New password</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">Choose a strong password for your account.</p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="New password" type="password" autoComplete="new-password" required hint="At least 8 characters, one uppercase, one number" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" autoComplete="new-password" required error={errors.confirm?.message} {...register('confirm')} />
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
              Reset password
            </Button>
          </form>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 transition">
              Back to sign in
            </Link>
          </p>
        </FadeIn>
      </AnimatedPage>
    </div>
  );
}
