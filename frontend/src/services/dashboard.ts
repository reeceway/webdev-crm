import api from './api';
import type { DashboardData } from '../types';

interface Activity {
  type: 'note' | 'project' | 'lead';
  id: number;
  title: string;
  created_at: string;
  user_name?: string;
  related_to?: string;
  status?: string;
  note_type?: string;
  company_name?: string;
}

interface Deadline {
  type: 'task' | 'project' | 'invoice' | 'followup';
  id: number;
  title: string;
  due_date: string;
  priority: string;
  project_name?: string;
  company_name?: string;
}

interface RevenueData {
  revenueByMonth: Array<{ month: string; revenue: number }>;
  invoicedByMonth: Array<{ month: string; invoiced: number }>;
}

export const dashboardService = {
  async getOverview(): Promise<DashboardData> {
    const response = await api.get<DashboardData>('/dashboard');
    return response.data;
  },

  async getActivity(limit?: number): Promise<Activity[]> {
    const response = await api.get<{ activity: Activity[] }>('/dashboard/activity', {
      params: { limit },
    });
    return response.data.activity;
  },

  async getDeadlines(days?: number): Promise<Deadline[]> {
    const response = await api.get<{ deadlines: Deadline[] }>('/dashboard/deadlines', {
      params: { days },
    });
    return response.data.deadlines;
  },

  async getRevenue(months?: number): Promise<RevenueData> {
    const response = await api.get<RevenueData>('/dashboard/revenue', {
      params: { months },
    });
    return response.data;
  },
};
