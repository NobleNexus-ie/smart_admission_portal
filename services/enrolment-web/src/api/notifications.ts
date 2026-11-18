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

export const notificationsApi = {
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
