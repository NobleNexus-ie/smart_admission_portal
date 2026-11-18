import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/hooks/useProfile';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { PageLoader } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';

export function ProfilePage() {
  const { t } = useTranslation();
  const { profile, isLoading, isError } = useProfile();

  if (isLoading) return <PageLoader />;
  if (isError) {
    return (
      <div className="page-container">
        <p className="text-red-600">Could not load profile.</p>
      </div>
    );
  }

  return (
    <AnimatedPage className="page-container max-w-3xl space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">{t('profile.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t('profile.completeMessage')}
            </p>
          </div>
          <Link to="/profile/notifications">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4" />
              {t('profile.notifications')}
            </Button>
          </Link>
        </div>
      </FadeIn>
      <FadeIn delay={0.1}>
        <div className="glass-card">
          <ProfileForm profile={profile} key={profile?.id ?? 'new'} />
        </div>
      </FadeIn>
    </AnimatedPage>
  );
}
