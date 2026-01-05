import api from './api';
import type { Invoice, InvoiceItem, InvoiceStatus, Payment } from '../types';

interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}

interface InvoiceParams {
  search?: string;
  status?: InvoiceStatus;
  company_id?: number;
  project_id?: number;
  limit?: number;
  offset?: number;
}

interface InvoiceStats {
  byStatus: Array<{ status: string; count: number; total_amount: number }>;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueInvoices: { count: number; total: number };
}

interface CreateInvoiceData {
  project_id?: number;
  company_id?: number;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string;
  tax_rate?: number;
  discount?: number;
  notes?: string;
  terms?: string;
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

export const invoicesService = {
  async getAll(params?: InvoiceParams): Promise<InvoicesResponse> {
    const response = await api.get<InvoicesResponse>('/invoices', { params });
    return response.data;
  },

  async getById(id: number): Promise<Invoice> {
    const response = await api.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  async getStats(): Promise<InvoiceStats> {
    const response = await api.get<InvoiceStats>('/invoices/stats');
    return response.data;
  },

  async create(data: CreateInvoiceData): Promise<Invoice> {
    const response = await api.post<{ invoice: Invoice }>('/invoices', data);
    return response.data.invoice;
  },

  async update(id: number, data: Partial<CreateInvoiceData>): Promise<Invoice> {
    const response = await api.put<{ invoice: Invoice }>(`/invoices/${id}`, data);
    return response.data.invoice;
  },

  async addPayment(
    invoiceId: number,
    data: { amount: number; payment_date: string; payment_method?: string; reference?: string; notes?: string }
  ): Promise<Payment> {
    const response = await api.post<{ payment: Payment }>(`/invoices/${invoiceId}/payments`, data);
    return response.data.payment;
  },

  async getPayments(invoiceId: number): Promise<Payment[]> {
    const response = await api.get<{ payments: Payment[] }>(`/invoices/${invoiceId}/payments`);
    return response.data.payments;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/invoices/${id}`);
  },
};
