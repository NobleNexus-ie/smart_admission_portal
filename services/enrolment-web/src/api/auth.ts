import apiClient from './client';
import type { AuthResponse, TokenPair } from '@/lib/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/register',
      payload,
    );
    return data;
  },

  verifyEmail: async (token: string) => {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/verify-email',
      { token },
    );
    return data;
  },

  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  refresh: async (refresh_token: string) => {
    const { data } = await apiClient.post<TokenPair>('/auth/refresh', {
      refresh_token,
    });
    return data;
  },

  staffLogin: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthResponse>(
      '/auth/staff/login',
      payload,
    );
    return data;
  },

  staffRefresh: async (refresh_token: string) => {
    const { data } = await apiClient.post<TokenPair>('/auth/staff/refresh', {
      refresh_token,
    });
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/forgot-password',
      { email },
    );
    return data;
  },

  resetPassword: async (token: string, new_password: string) => {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/reset-password',
      { token, new_password },
    );
    return data;
  },
};
