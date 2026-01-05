import api from './api';
import type { Task, TaskStatus, Priority } from '../types';

interface TasksResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

interface TaskParams {
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  project_id?: number;
  client_id?: number;
  lead_id?: number;
  assigned_to?: number;
  due_today?: boolean;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

interface TaskStats {
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  dueToday: number;
  dueThisWeek: number;
}

export const tasksService = {
  async getAll(params?: TaskParams): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/tasks', { params });
    return response.data;
  },

  async getMy(): Promise<{ tasks: Task[] }> {
    const response = await api.get<{ tasks: Task[] }>('/tasks/my');
    return response.data;
  },

  async getById(id: number): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async getStats(): Promise<TaskStats> {
    const response = await api.get<TaskStats>('/tasks/stats');
    return response.data;
  },

  async create(data: Partial<Task>): Promise<Task> {
    const response = await api.post<{ task: Task }>('/tasks', data);
    return response.data.task;
  },

  async update(id: number, data: Partial<Task>): Promise<Task> {
    const response = await api.put<{ task: Task }>(`/tasks/${id}`, data);
    return response.data.task;
  },

  async complete(id: number): Promise<Task> {
    const response = await api.post<{ task: Task }>(`/tasks/${id}/complete`);
    return response.data.task;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },
};
