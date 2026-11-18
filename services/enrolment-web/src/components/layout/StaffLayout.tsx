import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, STAFF_NAV } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { isAuthenticated } from '@/lib/auth';

export function StaffAuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated('staff')) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export function StaffLayout() {
  const { logout, staffUser } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        items={STAFF_NAV}
        brandSubtitle="School Staff Portal"
        userLabel={staffUser?.name || staffUser?.email}
        onLogout={logout}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
