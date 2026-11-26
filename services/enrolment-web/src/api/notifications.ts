import apiClient from './client';

export interface NotificationPreference {
  id: string;
  frequency: string;
  reminders_enabled: boolean;
  status_updates_enabled: boolean;
}

export interface UpdatePreferencePayload {
  frequency?: string;
  reminders_enabled?: boolean;
  status_updates_enabled?: boolean;
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  application_id: string | null;
  created_at: string;
  is_read: boolean;
}

export const notificationsApi = {
  getNotifications: async () => {
    const { data } = await apiClient.get<NotificationItem[]>(
      '/parents/notifications',
    );
    return data;
  },

  getPreferences: async () => {
    const { data } = await apiClient.get<NotificationPreference>(
      '/parents/notification-preferences',
    );
    return data;
  },

  updatePreferences: async (payload: UpdatePreferencePayload) => {
    const { data } = await apiClient.put<NotificationPreference>(
      '/parents/notification-preferences',
      payload,
    );
    return data;
  },
};
