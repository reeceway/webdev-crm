// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Company types
export interface Company {
  id: number;
  name: string;
  email?: string;
  website?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  clients?: Client[];
  projects?: Project[];
}

// Client types
export interface Client {
  id: number;
  company_id?: number;
  company_name?: string;
  first_name: string;
  last_name: string;
  name?: string; // Computed: first_name + last_name
  email?: string;
  phone?: string;
  position?: string;
  is_primary_contact: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  projects?: Project[];
  tasks?: Task[];
}

// Project types
export type ProjectStatus = 'proposal' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'active';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: number;
  company_id?: number;
  company_name?: string;
  client_id?: number;
  client_name?: string;
  client_email?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  project_type?: string;
  budget?: number;
  estimated_hours?: number;
  actual_hours: number;
  hours_logged?: number; // Alias for actual_hours
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  priority: Priority;
  notes?: string;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
  invoices?: Invoice[];
}

// Invoice types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  client_id?: number;
  client_name?: string;
  project_id?: number;
  project_name?: string;
  company_id?: number;
  company_name?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_zip?: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date?: string;
  due_date?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  total_amount?: number; // Alias for total
  amount_paid: number;
  paid_amount?: number; // Alias for amount_paid
  notes?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

// Lead types
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: number;
  company_name?: string;
  contact_name: string;
  email?: string;
  phone?: string;
  website?: string;
  source?: string;
  status: LeadStatus;
  estimated_value?: number;
  probability: number;
  notes?: string;
  next_follow_up?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
}

// Task types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: number;
  project_id?: number;
  project_name?: string;
  client_id?: number;
  client_name?: string;
  lead_id?: number;
  lead_name?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string;
  completed_at?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

// Note types
export type NoteType = 'general' | 'call' | 'email' | 'meeting' | 'followup';

export interface Note {
  id: number;
  client_id?: number;
  client_name?: string;
  company_id?: number;
  company_name?: string;
  project_id?: number;
  project_name?: string;
  lead_id?: number;
  lead_name?: string;
  title?: string;
  content: string;
  note_type: NoteType;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

// Dashboard types
export interface DashboardData {
  counts: {
    clients: number;
    companies: number;
    activeProjects: number;
    openLeads: number;
    pendingTasks: number;
    unpaidInvoices: number;
  };
  financial: {
    totalRevenue: number;
    pendingPayments: number;
    overdueAmount: number;
    thisMonthRevenue: number;
  };
  pipeline: {
    totalValue: number;
    weightedValue: number;
    wonThisMonth: number;
  };
  urgent: {
    overdueTasks: number;
    tasksDueToday: number;
    overdueInvoices: number;
    overdueFollowUps: number;
  };
}

// API Response types
export interface PaginatedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  [key: string]: T[] | number;
}

export interface ApiError {
  error: string;
  message?: string;
  errors?: Array<{ msg: string; param: string }>;
}
