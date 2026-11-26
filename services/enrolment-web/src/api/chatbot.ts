import apiClient from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChildOption {
  id: string;
  name: string;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  previous_school_name: string | null;
  previous_board: string | null;
  previous_marks: string | null;
  medical_conditions: string | null;
  special_needs: string | null;
}

export interface ChatbotResponse {
  session_id: string;
  message: string;
  current_topic: string;
  conversation_history: ChatMessage[];
  application_data: Record<string, string>;
  completeness: number;
  status: 'active' | 'completed' | 'switched_to_form' | 'abandoned' | 'submitted';
  missing_mandatory: string[];
  missing_optional: string[];
  children: ChildOption[];
  selected_school_ids: string[];
  already_submitted_school_ids: string[];
  school_filters?: { board?: string; city?: string; area?: string };
}

export interface ChatSummary {
  session_id: string;
  application_data: Record<string, string>;
  completeness: number;
  missing_fields: string[];
  missing_mandatory: string[];
  missing_optional: string[];
  status: string;
}

export interface SwitchToFormResponse {
  form_data: Record<string, string>;
  session_id: string;
}

export interface SessionListItem {
  session_id: string;
  status: string;
  current_topic: string;
  student_name: string;
  completeness: number;
  updated_at: string | null;
  created_at: string | null;
  submitted_school_count: number;
}

export interface SchoolResult {
  id: string;
  name: string;
  board: string;
  area: string;
  city: string;
  state: string;
  status: 'active' | 'inactive';
  grades_offered: string[];
  required_documents?: string[];
}

export const chatbotApi = {
  listSessions: async () => {
    const { data } = await apiClient.get<SessionListItem[]>('/chatbot/sessions');
    return data;
  },

  deleteSessions: async (session_ids: string[]) => {
    await apiClient.delete('/chatbot/sessions', { data: { session_ids } });
  },

  start: async () => {
    const { data } = await apiClient.post<ChatbotResponse>('/chatbot/start');
    return data;
  },

  resume: async (session_id: string) => {
    const { data } = await apiClient.get<ChatbotResponse>(`/chatbot/resume/${session_id}`);
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

  selectChild: async (session_id: string, child_id: string) => {
    const { data } = await apiClient.post<ChatbotResponse>(
      '/chatbot/select-child',
      { session_id, child_id },
    );
    return data;
  },

  searchSchools: async (session_id: string, filters?: {
    grade?: string;
    board?: string;
    city?: string;
    area?: string;
  }) => {
    const { data } = await apiClient.get<SchoolResult[]>(
      '/chatbot/search-schools',
      { params: { session_id, ...filters } },
    );
    return data;
  },
};
