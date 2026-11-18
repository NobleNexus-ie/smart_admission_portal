import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ApplicationStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const ax = error as {
      response?: { data?: { error?: string; detail?: unknown; details?: { field?: string; message?: string }[] } };
      message?: string;
    };
    const data = ax.response?.data;
    if (data?.details?.length) {
      return data.details.map((d) => d.message ?? JSON.stringify(d)).join(', ');
    }
    if (data?.error && typeof data.error === 'string') return data.error;
    const detail = data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string }) => d.msg ?? JSON.stringify(d))
        .join(', ');
    }
    if (ax.message) return ax.message;
  }
  return 'Something went wrong. Please try again.';
}

export function statusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    info_requested: 'Info Requested',
    withdrawn: 'Withdrawn',
  };
  return labels[status] ?? status;
}

export function passwordSchemaCheck(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  return { valid: errors.length === 0, errors };
}
