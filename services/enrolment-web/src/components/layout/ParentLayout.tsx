import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, PARENT_NAV } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { PageLoader } from '@/components/ui/Spinner';
import { isAuthenticated } from '@/lib/auth';

export function ParentAuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated('parent')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export function ParentLayout() {
  const { logout, parentUser } = useAuth();
  const { profile, isLoading, isComplete } = useProfile();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Loading your profile…" />
      </div>
    );
  }

  const allowedIncomplete = ['/profile', '/profile/children', '/profile/notifications', '/onboarding'];
  const isAllowedPage = allowedIncomplete.some((p) => location.pathname.startsWith(p));
  if (profile && !isComplete && !isAllowedPage) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        items={PARENT_NAV}
        brandSubtitle="Parent Portal"
        userLabel={profile?.full_name || parentUser?.email}
        onLogout={logout}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
