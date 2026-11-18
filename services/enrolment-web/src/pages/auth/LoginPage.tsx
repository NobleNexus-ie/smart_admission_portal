import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, error, setError } = useAuth();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Parent login</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your school applications.</p>
        </FadeIn>

        {message && (
          <FadeIn delay={0.15}>
            <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 ring-1 ring-brand-200/50">
              {message}
            </p>
          </FadeIn>
        )}

        <FadeIn delay={0.2}>
          <form
            className="mt-8 space-y-4"
            onSubmit={handleSubmit((values) => {
              setError(null);
              login.mutate(values);
            })}
          >
            <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/50"
              >
                {error}
              </motion.p>
            )}
            <Button type="submit" className="w-full shadow-glow" loading={login.isPending}>
              Sign in
            </Button>
          </form>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700 transition">
              Forgot your password?
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 transition">
              Register
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-slate-400">
            School staff?{' '}
            <Link to="/staff/login" className="text-brand-600 hover:text-brand-700 transition">
              Staff portal
            </Link>
          </p>
        </FadeIn>
      </AnimatedPage>
    </div>
  );
}
