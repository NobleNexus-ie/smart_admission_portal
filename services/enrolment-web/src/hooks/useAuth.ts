import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi, type LoginPayload, type RegisterPayload } from '@/api/auth';
import {
  clearAuth,
  clearEmbedSchoolId,
  getAccessToken,
  getEmbedSchoolId,
  getStoredUser,
  getUserRole,
  setAuthSession,
} from '@/lib/auth';
import type { ParentUser, StaffUser } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

export function useAuth() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const role = getUserRole();
  const isParent = role === 'parent' && !!getAccessToken();
  const isStaff = role === 'staff' && !!getAccessToken();
  const parentUser = useMemo(
    () => (isParent ? getStoredUser<ParentUser>() : null),
    [isParent],
  );
  const staffUser = useMemo(
    () => (isStaff ? getStoredUser<StaffUser>() : null),
    [isStaff],
  );

  const afterParentLogin = useCallback(() => {
    const embedSchool = getEmbedSchoolId();
    if (embedSchool) {
      clearEmbedSchoolId();
      navigate(`/enrolment/apply/${embedSchool}`);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: () => {
      setError(null);
      navigate('/login', {
        state: {
          message:
            'Registration successful. Please check your email to verify your account before logging in.',
        },
      });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setError(null);
      setAuthSession(
        data.access_token,
        data.refresh_token,
        'parent',
        data.user,
      );
      afterParentLogin();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const staffLoginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.staffLogin(payload),
    onSuccess: (data) => {
      setError(null);
      setAuthSession(data.access_token, data.refresh_token, 'staff', data.user);
      navigate('/staff/applications');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const verifyMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const logout = useCallback(() => {
    clearAuth();
    navigate(role === 'staff' ? '/staff/login' : '/login');
  }, [navigate, role]);

  return {
    isParent,
    isStaff,
    parentUser,
    staffUser,
    error,
    setError,
    register: registerMutation,
    login: loginMutation,
    staffLogin: staffLoginMutation,
    verify: verifyMutation,
    logout,
  };
}
