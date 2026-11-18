import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { verify, error } = useAuth();

  useEffect(() => {
    if (token) verify.mutate(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            Missing verification token
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Open the link from your email to verify your account.
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button className="shadow-glow">Go to login</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (verify.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Verifying your email..." />
      </div>
    );
  }

  const success = verify.isSuccess;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md text-center"
      >
        {success ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"
            >
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </motion.div>
            <h1 className="mt-4 font-display text-2xl font-bold">
              Email verified
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your account is ready. You can now sign in.
            </p>
            <Link to="/login" className="mt-6 inline-block">
              <Button className="shadow-glow">Sign in</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">
              Verification failed
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {error || 'This link may be invalid or expired.'}
            </p>
            <Link to="/register" className="mt-6 inline-block">
              <Button variant="outline">Register again</Button>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
