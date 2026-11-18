import apiClient from './client';

export interface StaffAnalytics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  info_requested: number;
  approval_rate: number;
  avg_response_time_hours: number;
  applications_by_grade: Record<string, number>;
  applications_over_time: { date: string; count: number }[];
}

export interface PlatformAnalytics {
  total_schools: number;
  total_parents: number;
  total_applications: number;
  applications_by_status: Record<string, number>;
  schools_by_status: Record<string, number>;
  weekly_growth: {
    week: string;
    week_start: string;
    new_schools: number;
    new_parents: number;
    new_applications: number;
  }[];
  top_schools_by_applications: { name: string; applications: number }[];
}

export const analyticsApi = {
  getStaffAnalytics: async () => {
    const { data } = await apiClient.get<StaffAnalytics>('/staff/analytics');
    return data;
  },

  getPlatformAnalytics: async () => {
    const { data } = await apiClient.get<PlatformAnalytics>('/platform/analytics');
    return data;
  },
};
