import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/utils';
import apiClient from '@/api/client';

export function StaffSetupPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/staff/setup', { token, password });
      setDone(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card text-center">
          <p className="text-red-600">Invalid setup link. No token provided.</p>
          <Link to="/staff/login" className="mt-4 inline-block text-sm text-brand-600 hover:text-brand-700">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Account ready!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your password has been set. You can now log in to the staff portal.
          </p>
          <Link to="/staff/login">
            <Button className="mt-6 w-full">Go to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 shadow-glow">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Set up your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a password to access the VedaAcademy staff portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Set password
          </Button>
        </form>
      </div>
    </div>
  );
}
