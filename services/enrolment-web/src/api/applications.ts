import apiClient from './client';
import type {
  Application,
  ApplicationDocument,
  CreateApplicationPayload,
  RespondInfoPayload,
} from '@/lib/types';

export const applicationsApi = {
  list: async () => {
    const { data } = await apiClient.get<Application[]>('/applications');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Application>(`/applications/${id}`);
    return data;
  },

  create: async (payload: CreateApplicationPayload) => {
    const { data } = await apiClient.post<Application>(
      '/applications',
      payload,
    );
    return data;
  },

  update: async (id: string, form_data: CreateApplicationPayload['form_data']) => {
    const { data } = await apiClient.put<Application>(`/applications/${id}`, {
      form_data,
    });
    return data;
  },

  submit: async (id: string) => {
    const { data } = await apiClient.put<Application>(
      `/applications/${id}/submit`,
    );
    return data;
  },

  uploadDocument: async (
    id: string,
    file: File,
    document_type: string,
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', document_type);
    const { data } = await apiClient.post<ApplicationDocument>(
      `/applications/${id}/documents`,
      form,
    );
    return data;
  },

  respondInfo: async (id: string, payload: RespondInfoPayload, files?: File[]) => {
    const form = new FormData();
    form.append('info_request_id', payload.info_request_id);
    form.append(
      'response_data',
      JSON.stringify(payload.field_responses ?? {}),
    );
    if (files && files.length > 0) {
      files.forEach((f) => form.append('files', f));
    }
    const { data } = await apiClient.post<Application>(
      `/applications/${id}/respond-info`,
      form,
    );
    return data;
  },
};
