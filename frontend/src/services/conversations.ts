import api from './api';

export interface Conversation {
  id: number;
  lead_id?: number;
  pipeline_id?: number;
  client_id?: number;
  company_id?: number;
  activity_type: string;
  title?: string;
  content: string;
  contact_method?: string;
  outcome?: string;
  next_steps?: string;
  follow_up_date?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  stage?: string;
}

export interface ConversationOptions {
  activity_types: string[];
  contact_methods: string[];
  outcomes: string[];
}

export const conversationsService = {
  getAll: async (params: { lead_id?: number; pipeline_id?: number; client_id?: number; company_id?: number }) => {
    const response = await api.get('/conversations', { params });
    return response.data;
  },

  getHistory: async (params: { lead_id?: number; pipeline_id?: number; client_id?: number; company_id?: number }) => {
    const response = await api.get('/conversations/history', { params });
    return response.data;
  },

  getOptions: async (): Promise<ConversationOptions> => {
    const response = await api.get('/conversations/options');
    return response.data;
  },

  create: async (conversation: Partial<Conversation>) => {
    const response = await api.post('/conversations', conversation);
    return response.data;
  },

  update: async (id: number, conversation: Partial<Conversation>) => {
    const response = await api.put(`/conversations/${id}`, conversation);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/conversations/${id}`);
    return response.data;
  },

  link: async (id: number, data: { pipeline_id?: number; client_id?: number; company_id?: number }) => {
    const response = await api.post(`/conversations/${id}/link`, data);
    return response.data;
  },

  bulkLink: async (data: { 
    from_lead_id?: number; 
    from_pipeline_id?: number; 
    to_pipeline_id?: number; 
    to_client_id?: number; 
    to_company_id?: number 
  }) => {
    const response = await api.post('/conversations/bulk-link', data);
    return response.data;
  }
};
