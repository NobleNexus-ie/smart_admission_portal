import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  GraduationCap,
  User,
  ClipboardList,
  BarChart3,
  LogOut,
  FileText,
  Baby,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

export interface NavItem {
  to: string;
  label: string;
  i18nKey?: string;
  icon: LucideIcon;
  end?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  brandSubtitle?: string;
  userLabel?: string;
  onLogout: () => void;
}

export const PARENT_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', i18nKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/enrolment', label: 'Enrolment', i18nKey: 'nav.enrolment', icon: GraduationCap, end: true },
  { to: '/enrolment/applications', label: 'My Applications', i18nKey: 'nav.myApplications', icon: FileText, end: true },
  { to: '/profile', label: 'Profile', i18nKey: 'nav.profile', icon: User, end: true },
  { to: '/profile/children', label: 'Children', i18nKey: 'children.title', icon: Baby, end: true },
];

export const STAFF_NAV: NavItem[] = [
  {
    to: '/staff/applications',
    label: 'Applications',
    icon: ClipboardList,
    end: false,
  },
  {
    to: '/staff/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
];

export function Sidebar({
  items,
  brandSubtitle = 'Parent Portal',
  userLabel,
  onLogout,
}: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/60 bg-white/70 backdrop-blur-lg overflow-hidden">
      <div className="border-b border-slate-100/60 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-purple-500 shadow-glow">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-sm font-bold gradient-text">
              VedaAcademy
            </p>
            <p className="text-[11px] text-slate-400">{brandSubtitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-brand-50 to-purple-50 text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                  isActive
                    ? 'bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500'
                )}>
                  <item.icon className="h-4 w-4" />
                </span>
                {item.i18nKey ? t(item.i18nKey) : item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100/60 p-4">
        <div className="mb-2 px-1">
          <LanguageSelector />
        </div>
        {userLabel && (
          <p className="mb-2 truncate px-1 text-xs text-slate-400">{userLabel}</p>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <LogOut className="h-4 w-4" />
          </span>
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
