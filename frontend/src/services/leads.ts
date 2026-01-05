import api from './api';
import type { Lead, LeadStatus, Client, Company } from '../types';

interface LeadsResponse {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

interface LeadParams {
  search?: string;
  status?: LeadStatus;
  source?: string;
  assigned_to?: number;
  limit?: number;
  offset?: number;
}

interface LeadStats {
  byStatus: Array<{ status: string; count: number; total_value: number }>;
  bySource: Array<{ source: string; count: number }>;
  totalLeads: number;
  totalValue: number;
  weightedValue: number;
  upcomingFollowUps: number;
  overdueFollowUps: number;
}

interface ConvertLeadResponse {
  message: string;
  client: Client;
  company: Company | null;
  lead_id: number;
}

export const leadsService = {
  async getAll(params?: LeadParams): Promise<LeadsResponse> {
    const response = await api.get<LeadsResponse>('/leads', { params });
    return response.data;
  },

  async getById(id: number): Promise<Lead> {
    const response = await api.get<Lead>(`/leads/${id}`);
    return response.data;
  },

  async getStats(): Promise<LeadStats> {
    const response = await api.get<LeadStats>('/leads/stats');
    return response.data;
  },

  async create(data: Partial<Lead>): Promise<Lead> {
    const response = await api.post<{ lead: Lead }>('/leads', data);
    return response.data.lead;
  },

  async update(id: number, data: Partial<Lead>): Promise<Lead> {
    const response = await api.put<{ lead: Lead }>(`/leads/${id}`, data);
    return response.data.lead;
  },

  async convert(id: number): Promise<ConvertLeadResponse> {
    const response = await api.post<ConvertLeadResponse>(`/leads/${id}/convert`);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/leads/${id}`);
  },
};
