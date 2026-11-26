import apiClient from './client';
import type {
  Application,
  ApprovePayload,
  RejectPayload,
  RequestInfoPayload,
} from '@/lib/types';

interface StaffListItem {
  application_school_id: string;
  application_id: string;
  school_id: string;
  status: string;
  submitted_at: string | null;
  student_name: string | null;
  grade: string | null;
  parent_email: string | null;
}

function listItemToApplication(item: StaffListItem): Application {
  return {
    id: item.application_id,
    parent_id: '',
    form_data: {
      student_full_name: item.student_name ?? '',
      grade_applying_for: item.grade ?? '',
      emergency_contact_name: item.parent_email ?? '',
    },
    status: item.status as Application['status'],
    method: 'form',
    created_at: item.submitted_at ?? '',
    submitted_at: item.submitted_at,
  } as Application;
}

interface StaffDetailResponse {
  application: Application;
  parent_email: string;
  parent_profile: Record<string, unknown> | null;
  review_history: unknown[];
  info_requests: unknown[];
  documents: unknown[];
}

function detailToApplication(detail: StaffDetailResponse): Application {
  const app = detail.application as any;
  const schoolStatus = app.schools?.[0]?.status;
  return {
    ...app,
    status: (schoolStatus ?? app.status) as Application['status'],
    documents: detail.documents as Application['documents'],
    info_requests: detail.info_requests?.map((ir: any) => ({
      id: ir.id as string,
      fields: (ir.fields_requested ?? []) as string[],
      documents: (ir.documents_requested ?? []) as string[],
      message: ir.message as string,
      status: ir.status as string,
      created_at: ir.created_at as string,
      responded_at: ir.has_response ? (ir.created_at as string) : null,
    })) as Application['info_requests'],
  };
}

export const staffApi = {
  listApplications: async (status?: string) => {
    const { data } = await apiClient.get<{ items: StaffListItem[]; total: number }>('/staff/applications', {
      params: status && status !== 'all' ? { status } : undefined,
    });
    return (data.items ?? []).map(listItemToApplication);
  },

  getApplication: async (id: string) => {
    const { data } = await apiClient.get<StaffDetailResponse>(
      `/staff/applications/${id}`,
    );
    return detailToApplication(data);
  },

  approve: async (id: string, payload: ApprovePayload) => {
    const { data } = await apiClient.post<StaffDetailResponse>(
      `/staff/applications/${id}/approve`,
      payload,
    );
    return detailToApplication(data);
  },

  reject: async (id: string, payload: RejectPayload) => {
    const { data } = await apiClient.post<StaffDetailResponse>(
      `/staff/applications/${id}/reject`,
      payload,
    );
    return detailToApplication(data);
  },

  requestInfo: async (id: string, payload: RequestInfoPayload) => {
    const { data } = await apiClient.post<StaffDetailResponse>(
      `/staff/applications/${id}/request-info`,
      payload,
    );
    return detailToApplication(data);
  },

  getSchool: async () => {
    const { data } = await apiClient.get<StaffSchool>('/staff/school');
    return data;
  },

  updateSchool: async (payload: Partial<StaffSchool>) => {
    const { data } = await apiClient.put<StaffSchool>('/staff/school', payload);
    return data;
  },

  listMembers: async () => {
    const { data } = await apiClient.get<StaffMember[]>('/staff/school/members');
    return data;
  },

  inviteMember: async (payload: { email: string; name: string; role: string }) => {
    const { data } = await apiClient.post<StaffMember>('/staff/school/members', payload);
    return data;
  },

  removeMember: async (id: string) => {
    await apiClient.delete(`/staff/school/members/${id}`);
  },
};

export interface StaffSchool {
  id: string;
  name: string;
  board: string;
  school_type: string | null;
  address: string;
  area: string;
  city: string;
  state: string;
  contact_email: string;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
  facilities: string[] | null;
  fee_range: string | null;
  student_teacher_ratio: string | null;
  grades_offered: string[] | null;
  website_url: string | null;
}

export interface StaffMember {
  id: string;
  school_id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[] | null;
  created_at: string | null;
}
