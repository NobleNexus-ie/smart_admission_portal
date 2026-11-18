import type { UserRole } from './types';

const ACCESS_KEY = 'enrolment_access_token';
const REFRESH_KEY = 'enrolment_refresh_token';
const ROLE_KEY = 'enrolment_user_role';
const USER_KEY = 'enrolment_user';
const EMBED_SCHOOL_KEY = 'enrolment_embed_school_id';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUserRole(): UserRole | null {
  return localStorage.getItem(ROLE_KEY) as UserRole | null;
}

export function getStoredUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function setAuthSession(
  access: string,
  refresh: string,
  role: UserRole,
  user: unknown,
): void {
  setTokens(access, refresh);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(role?: UserRole): boolean {
  const token = getAccessToken();
  if (!token) return false;
  if (role) return getUserRole() === role;
  return true;
}

export function setEmbedSchoolId(schoolId: string): void {
  localStorage.setItem(EMBED_SCHOOL_KEY, schoolId);
}

export function getEmbedSchoolId(): string | null {
  return localStorage.getItem(EMBED_SCHOOL_KEY);
}

export function clearEmbedSchoolId(): void {
  localStorage.removeItem(EMBED_SCHOOL_KEY);
}

export function authenticatedUrl(url: string): string {
  const token = getAccessToken();
  if (!token || !url.startsWith('/api/v1/files/')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${token}`;
}
