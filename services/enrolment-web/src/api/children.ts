import { apiClient } from './client';

export interface Child {
  id: string;
  parent_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  nationality: string | null;
  mother_tongue: string | null;
  previous_school_name: string | null;
  previous_board: string | null;
  previous_grade: string | null;
  previous_marks: string | null;
  special_needs: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ChildPayload {
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  nationality?: string;
  mother_tongue?: string;
  previous_school_name?: string;
  previous_board?: string;
  previous_grade?: string;
  previous_marks?: string;
  special_needs?: string;
  medical_conditions?: string;
  allergies?: string;
}

export const childrenApi = {
  list: () => apiClient.get<Child[]>('/parents/children').then(r => r.data),
  create: (data: ChildPayload) => apiClient.post<Child>('/parents/children', data).then(r => r.data),
  update: (id: string, data: ChildPayload) => apiClient.put<Child>(`/parents/children/${id}`, data).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/parents/children/${id}`),
};
