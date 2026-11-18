import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { UserPlus, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerMutation, error, setError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const pwd = watch('password') || '';
  const checks = [
    { label: '8+ characters', ok: pwd.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pwd) },
    { label: 'Number', ok: /[0-9]/.test(pwd) },
  ];

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
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Create account</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Register with your email. You&apos;ll verify before signing in.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <form
            className="mt-8 space-y-4"
            onSubmit={handleSubmit((values) => {
              setError(null);
              registerMutation.mutate({ email: values.email, password: values.password });
            })}
          >
            <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
            <div>
              <Input label="Password" type="password" autoComplete="new-password" required error={errors.password?.message} {...register('password')} />
              {pwd.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {checks.map((c) => (
                    <motion.span
                      key={c.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        c.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className={`h-3 w-3 ${c.ok ? 'text-emerald-500' : 'text-slate-300'}`} />
                      {c.label}
                    </motion.span>
                  ))}
                </div>
              )}
            </div>
            <Input label="Confirm password" type="password" autoComplete="new-password" required error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/50"
              >
                {error}
              </motion.p>
            )}
            <Button type="submit" className="w-full shadow-glow" loading={registerMutation.isPending}>
              Register
            </Button>
          </form>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 text-xs text-amber-800 backdrop-blur-sm">
            After registering, check your inbox for a verification link before logging in.
          </p>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 transition">
              Sign in
            </Link>
          </p>
        </FadeIn>
      </AnimatedPage>
    </div>
  );
}
