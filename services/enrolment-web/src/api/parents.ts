import apiClient from './client';
import type {
  DashboardSummary,
  ParentProfile,
  ProfileUpdatePayload,
} from '@/lib/types';

export const parentsApi = {
  getProfile: async () => {
    const { data } = await apiClient.get<ParentProfile>('/parents/profile');
    return data;
  },

  updateProfile: async (payload: ProfileUpdatePayload) => {
    const { data } = await apiClient.put<ParentProfile>(
      '/parents/profile',
      payload,
    );
    return data;
  },

  uploadIdProof: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<{ id_proof_url: string }>(
      '/parents/profile/id-proof',
      form,
    );
    return data;
  },

  getDashboard: async () => {
    const { data } = await apiClient.get<DashboardSummary>(
      '/parents/dashboard',
    );
    return data;
  },
};
