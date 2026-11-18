import apiClient from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotResponse {
  session_id: string;
  message: string;
  current_topic: string;
  conversation_history: ChatMessage[];
  application_data: Record<string, string>;
  completeness: number;
  status: 'active' | 'completed' | 'switched_to_form';
}

export interface ChatSummary {
  session_id: string;
  application_data: Record<string, string>;
  completeness: number;
  missing_fields: string[];
  status: string;
}

export interface SwitchToFormResponse {
  form_data: Record<string, string>;
  session_id: string;
}

export const chatbotApi = {
  start: async () => {
    const { data } = await apiClient.post<ChatbotResponse>('/chatbot/start');
    return data;
  },

  respond: async (session_id: string, message: string) => {
    const { data } = await apiClient.post<ChatbotResponse>('/chatbot/respond', {
      session_id,
      message,
    });
    return data;
  },

  getSummary: async (session_id: string) => {
    const { data } = await apiClient.get<ChatSummary>('/chatbot/summary', {
      params: { session_id },
    });
    return data;
  },

  switchToForm: async (session_id: string) => {
    const { data } = await apiClient.post<SwitchToFormResponse>(
      '/chatbot/switch-to-form',
      { session_id },
    );
    return data;
  },
};
