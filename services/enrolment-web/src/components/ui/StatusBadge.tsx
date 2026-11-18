import { useTranslation } from 'react-i18next';
import type { ApplicationStatus, SchoolStatus } from '@/lib/types';
import { statusLabel } from '@/lib/utils';
import { Badge } from './Badge';

const appVariants: Record<
  ApplicationStatus,
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  info_requested: 'info',
  withdrawn: 'neutral',
};

const schoolVariants: Record<
  SchoolStatus,
  'default' | 'success' | 'warning' | 'danger' | 'neutral'
> = {
  pending: 'warning',
  active: 'success',
  inactive: 'neutral',
  archived: 'danger',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant={appVariants[status]} dot>
      {statusLabel(status)}
    </Badge>
  );
}

export function SchoolStatusBadge({
  status,
  accepting,
}: {
  status: SchoolStatus;
  accepting?: boolean;
}) {
  const { t } = useTranslation();
  if (status === 'active' && accepting !== false) {
    return <Badge variant="success" dot>{t('schools.acceptingApplications')}</Badge>;
  }
  if (status === 'active') {
    return <Badge variant="neutral" dot>{t('schools.notAccepting')}</Badge>;
  }
  return (
    <Badge variant={schoolVariants[status]} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
