import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import { useSchool } from '@/hooks/useSchools';
import { Button } from '@/components/ui/Button';
import { SchoolStatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/Spinner';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

export function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: school, isLoading, isError } = useSchool(id);

  if (isLoading) return <PageLoader />;
  if (isError || !school) {
    return (
      <div className="page-container">
        <p className="text-red-600">School not found.</p>
        <Link to="/enrolment" className="mt-4 inline-block text-brand-600">
          Back to search
        </Link>
      </div>
    );
  }

  const accepting =
    school.status === 'active' && school.accepting_applications !== false;

  return (
    <AnimatedPage className="page-container max-w-3xl space-y-6">
      <Link
        to="/enrolment"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      <FadeIn delay={0.1}>
        <div className="glass-card sm:!p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-900">
                {school.name}
              </h1>
              <p className="mt-1 text-slate-500">{school.board}</p>
              <div className="mt-3">
                <SchoolStatusBadge
                  status={school.status}
                  accepting={accepting}
                />
              </div>
            </div>
            {accepting ? (
              <Link to={`/enrolment/apply/${school.id}`}>
                <Button size="lg" className="shadow-glow">Apply now</Button>
              </Link>
            ) : (
              <Button size="lg" disabled variant="secondary">
                Not Accepting
              </Button>
            )}
          </div>

          {school.description && (
            <p className="mt-6 leading-relaxed text-slate-600">
              {school.description}
            </p>
          )}

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <MapPin className="h-4 w-4 text-brand-500" />
              </span>
              <div>
                <dt className="text-slate-400">Address</dt>
                <dd className="font-medium text-slate-800">
                  {[school.address, school.area, school.city, school.state]
                    .filter(Boolean)
                    .join(', ')}
                </dd>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Phone className="h-4 w-4 text-brand-500" />
              </span>
              <div>
                <dt className="text-slate-400">Phone</dt>
                <dd className="font-medium text-slate-800">{school.phone || '—'}</dd>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Mail className="h-4 w-4 text-brand-500" />
              </span>
              <div>
                <dt className="text-slate-400">Email</dt>
                <dd className="font-medium text-slate-800">{school.contact_email || '—'}</dd>
              </div>
            </div>
          </dl>

          {school.facilities && school.facilities.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-bold">Facilities</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {school.facilities.map((f) => (
                  <li
                    key={f}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/60"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {school.application_requirements && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-bold">
                Application requirements
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {school.application_requirements}
              </p>
            </div>
          )}
        </div>
      </FadeIn>
    </AnimatedPage>
  );
}
