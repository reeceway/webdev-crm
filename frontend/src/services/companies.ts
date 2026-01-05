import api from './api';
import type { Company } from '../types';

interface CompaniesResponse {
  companies: Company[];
  total: number;
  limit: number;
  offset: number;
}

interface CompanyParams {
  search?: string;
  industry?: string;
  limit?: number;
  offset?: number;
}

export const companiesService = {
  async getAll(params?: CompanyParams): Promise<CompaniesResponse> {
    const response = await api.get<CompaniesResponse>('/companies', { params });
    return response.data;
  },

  async getById(id: number): Promise<Company> {
    const response = await api.get<Company>(`/companies/${id}`);
    return response.data;
  },

  async create(data: Partial<Company>): Promise<Company> {
    const response = await api.post<{ company: Company }>('/companies', data);
    return response.data.company;
  },

  async update(id: number, data: Partial<Company>): Promise<Company> {
    const response = await api.put<{ company: Company }>(`/companies/${id}`, data);
    return response.data.company;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/companies/${id}`);
  },
};
