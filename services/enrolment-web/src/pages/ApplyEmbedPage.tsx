import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useResolveEmbed } from '@/hooks/useSchools';
import { isAuthenticated, setEmbedSchoolId } from '@/lib/auth';
import { getErrorMessage } from '@/lib/utils';

export function ApplyEmbedPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useResolveEmbed(token);

  useEffect(() => {
    if (!data?.school_id) return;
    setEmbedSchoolId(data.school_id);
    if (isAuthenticated('parent')) {
      navigate(`/enrolment/apply/${data.school_id}`, { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Opening school application…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            Invalid apply link
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {getErrorMessage(error) ||
              'This embed link is invalid or has been revoked.'}
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button>Go home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-xl font-semibold text-brand-800">
          Smart School Admissions
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">
          Apply to {data.school_name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in or create a parent account to continue your application.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/register">
            <Button size="lg">Register</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
