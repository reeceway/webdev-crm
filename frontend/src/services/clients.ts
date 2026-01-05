import api from './api';
import type { Client } from '../types';

interface ClientsResponse {
  clients: Client[];
  total: number;
  limit: number;
  offset: number;
}

interface ClientParams {
  search?: string;
  company_id?: number;
  limit?: number;
  offset?: number;
}

export const clientsService = {
  async getAll(params?: ClientParams): Promise<ClientsResponse> {
    const response = await api.get<ClientsResponse>('/clients', { params });
    return response.data;
  },

  async getById(id: number): Promise<Client> {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  },

  async create(data: Partial<Client>): Promise<Client> {
    const response = await api.post<{ client: Client }>('/clients', data);
    return response.data.client;
  },

  async update(id: number, data: Partial<Client>): Promise<Client> {
    const response = await api.put<{ client: Client }>(`/clients/${id}`, data);
    return response.data.client;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/clients/${id}`);
  },
};
