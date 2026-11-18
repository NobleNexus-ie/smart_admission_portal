import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getUserRole,
  setTokens,
} from '@/lib/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't try refresh on auth endpoints
    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refresh = getRefreshToken();
    if (!refresh) {
      clearAuth();
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      const role = getUserRole();
      const refreshPath =
        role === 'staff' ? '/auth/staff/refresh' : '/auth/refresh';
      const { data } = await axios.post(`${API_URL}${refreshPath}`, {
        refresh_token: refresh,
      });
      const newAccess = data.access_token as string;
      const newRefresh = (data.refresh_token as string) || refresh;
      setTokens(newAccess, newRefresh);
      processQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuth();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function redirectToLogin() {
  const role = getUserRole();
  const path = role === 'staff' ? '/staff/login' : '/login';
  if (window.location.pathname !== path) {
    window.location.href = path;
  }
}

export default apiClient;
