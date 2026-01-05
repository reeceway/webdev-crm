import api from './api';
import type { Project, ProjectStatus, Priority } from '../types';

interface ProjectsResponse {
  projects: Project[];
  total: number;
  limit: number;
  offset: number;
}

interface ProjectParams {
  search?: string;
  status?: ProjectStatus;
  company_id?: number;
  client_id?: number;
  priority?: Priority;
  limit?: number;
  offset?: number;
}

interface ProjectStats {
  byStatus: Array<{ status: string; count: number; total_budget: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  totalProjects: number;
  totalBudget: number;
  totalHours: number;
  overdueProjects: number;
}

export const projectsService = {
  async getAll(params?: ProjectParams): Promise<ProjectsResponse> {
    const response = await api.get<ProjectsResponse>('/projects', { params });
    return response.data;
  },

  async getById(id: number): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  async getStats(): Promise<ProjectStats> {
    const response = await api.get<ProjectStats>('/projects/stats');
    return response.data;
  },

  async create(data: Partial<Project>): Promise<Project> {
    const response = await api.post<{ project: Project }>('/projects', data);
    return response.data.project;
  },

  async update(id: number, data: Partial<Project>): Promise<Project> {
    const response = await api.put<{ project: Project }>(`/projects/${id}`, data);
    return response.data.project;
  },

  async logHours(id: number, hours: number): Promise<{ actual_hours: number }> {
    const response = await api.post<{ actual_hours: number }>(`/projects/${id}/hours`, { hours });
    return response.data;
  },

  async logTime(id: number, data: { hours: number; description?: string }): Promise<{ actual_hours: number }> {
    const response = await api.post<{ actual_hours: number }>(`/projects/${id}/hours`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
