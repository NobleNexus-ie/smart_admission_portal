import apiClient from './client';
import type {
  EmbedResolveResponse,
  PaginatedResponse,
  School,
  SchoolSearchParams,
} from '@/lib/types';

export const schoolsApi = {
  search: async (params: SchoolSearchParams) => {
    const { data } = await apiClient.get<PaginatedResponse<School>>(
      '/schools/search',
      { params },
    );
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<School>(`/schools/${id}`);
    return data;
  },

  resolveEmbed: async (token: string) => {
    const { data } = await apiClient.get<EmbedResolveResponse>(
      '/schools/resolve-embed',
      { params: { token } },
    );
    return data;
  },
};
