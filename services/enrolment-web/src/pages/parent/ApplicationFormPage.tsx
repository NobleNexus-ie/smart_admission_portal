import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSchool } from '@/hooks/useSchools';
import { ApplicationForm } from '@/components/forms/ApplicationForm';
import { PageLoader } from '@/components/ui/Spinner';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

export function ApplicationFormPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const { data: school, isLoading } = useSchool(schoolId);

  if (!schoolId) {
    return (
      <div className="page-container">
        <p className="text-red-600">Missing school.</p>
      </div>
    );
  }

  if (isLoading) return <PageLoader />;

  return (
    <AnimatedPage className="page-container max-w-3xl space-y-6">
      <Link
        to={school ? `/enrolment/schools/${schoolId}` : '/enrolment'}
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <FadeIn delay={0.1}>
        <h1 className="section-title">Application form</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete all steps to submit your child&apos;s application.
        </p>
      </FadeIn>
      <FadeIn delay={0.2}>
        <div className="glass-card">
          <ApplicationForm
            schoolId={schoolId}
            schoolName={school?.name}
          />
        </div>
      </FadeIn>
    </AnimatedPage>
  );
}
