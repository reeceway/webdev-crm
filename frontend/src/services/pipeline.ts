import api from './api';

export interface PipelineDeal {
  id: number;
  lead_id?: number;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  deal_name: string;
  deal_value: number;
  stage: string;
  probability: number;
  expected_close_date?: string;
  source?: string;
  notes?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  probability: number;
  count: number;
  total_value: number;
}

export interface PipelineActivity {
  id: number;
  pipeline_id: number;
  activity_type: string;
  title?: string;
  content: string;
  contact_method?: string;
  outcome?: string;
  next_steps?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export const pipelineService = {
  getAll: async (params?: { stage?: string; search?: string }) => {
    const response = await api.get('/pipeline', { params });
    return response.data;
  },

  getStages: async () => {
    const response = await api.get('/pipeline/stages');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/pipeline/${id}`);
    return response.data;
  },

  create: async (deal: Partial<PipelineDeal>) => {
    const response = await api.post('/pipeline', deal);
    return response.data;
  },

  update: async (id: number, deal: Partial<PipelineDeal>) => {
    const response = await api.put(`/pipeline/${id}`, deal);
    return response.data;
  },

  updateStage: async (id: number, stage: string) => {
    const response = await api.patch(`/pipeline/${id}/stage`, { stage });
    return response.data;
  },

  convertFromLead: async (leadId: number, data: { deal_name?: string; deal_value?: number; stage?: string }) => {
    const response = await api.post(`/pipeline/from-lead/${leadId}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/pipeline/${id}`);
    return response.data;
  },

  // Activities / Conversation Log
  getActivities: async (dealId: number) => {
    const response = await api.get(`/pipeline/${dealId}/activities`);
    return response.data;
  },

  addActivity: async (dealId: number, activity: Partial<PipelineActivity>) => {
    const response = await api.post(`/pipeline/${dealId}/activities`, activity);
    return response.data;
  },

  deleteActivity: async (dealId: number, activityId: number) => {
    const response = await api.delete(`/pipeline/${dealId}/activities/${activityId}`);
    return response.data;
  },

  convertToClient: async (dealId: number) => {
    const response = await api.post(`/pipeline/${dealId}/convert-to-client`);
    return response.data;
  }
};
