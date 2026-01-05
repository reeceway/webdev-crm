import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  Send,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard,
} from 'lucide-react';
import { invoicesService, clientsService, projectsService } from '../services';
import type { Invoice, InvoiceItem, Payment, Client, Project, InvoiceStatus } from '../types';
import { format, parseISO, isPast } from 'date-fns';

const statusOptions: { value: InvoiceStatus | ''; label: string; color: string }[] = [
  { value: '', label: 'All Status', color: '' },
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, clientsData, projectsData] = await Promise.all([
        invoicesService.getAll({
          search: search || undefined,
          status: statusFilter || undefined,
        }),
        clientsService.getAll(),
        projectsService.getAll(),
      ]);
      setInvoices(invoicesData.invoices);
      setClients(clientsData.clients);
      setProjects(projectsData.projects);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invoiceId: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoicesService.delete(invoiceId);
      loadData();
      if (selectedInvoice?.id === invoiceId) setSelectedInvoice(null);
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const getClientName = (clientId?: number) => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.name;
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700';
  };

  const totalOutstanding = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total_amount - (i.paid_amount || 0)), 0);

  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + (i.total_amount - (i.paid_amount || 0)), 0);

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main List */}
      <div className={`flex-1 flex flex-col ${selectedInvoice ? 'hidden lg:flex' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-500 mt-1">Manage billing and payments</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            New Invoice
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Outstanding</p>
                <p className="text-2xl font-bold text-blue-700">${totalOutstanding.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-700">${totalOverdue.toLocaleString()}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
              className="input w-full sm:w-44"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Invoices List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-500 mb-4">Create your first invoice</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2 inline" />
                New Invoice
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => setSelectedInvoice(invoice)}
                  className={`card cursor-pointer hover:border-orange-300 transition-colors ${
                    selectedInvoice?.id === invoice.id ? 'border-orange-500 bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{invoice.invoice_number}</h3>
                        <span className={`badge ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {getClientName(invoice.client_id) || 'No client'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${invoice.total_amount.toLocaleString()}
                        </p>
                        {invoice.paid_amount > 0 && invoice.paid_amount < invoice.total_amount && (
                          <p className="text-sm text-green-600">
                            ${invoice.paid_amount.toLocaleString()} paid
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {format(parseISO(invoice.due_date), 'MMM d')}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Panel */}
      {selectedInvoice && (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          clientName={getClientName(selectedInvoice.client_id)}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => setEditingInvoice(selectedInvoice)}
          onDelete={() => handleDelete(selectedInvoice.id)}
          onUpdate={loadData}
        />
      )}

      {/* Modal */}
      {(showModal || editingInvoice) && (
        <InvoiceModal
          invoice={editingInvoice}
          clients={clients}
          projects={projects}
          onClose={() => {
            setShowModal(false);
            setEditingInvoice(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingInvoice(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Invoice Detail Panel
interface InvoiceDetailPanelProps {
  invoice: Invoice;
  clientName: string | null | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

function InvoiceDetailPanel({ invoice, clientName, onClose, onEdit, onDelete, onUpdate }: InvoiceDetailPanelProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [invoice.id]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const [itemsData, paymentsData] = await Promise.all([
        invoicesService.getItems(invoice.id),
        invoicesService.getPayments(invoice.id),
      ]);
      setItems(itemsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Failed to load invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const balance = invoice.total_amount - (invoice.paid_amount || 0);
  const isOverdue = invoice.status !== 'paid' && isPast(parseISO(invoice.due_date));

  return (
    <div className="w-full lg:w-[450px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h2>
            <p className="text-gray-500">{clientName || 'No client'}</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <span className={`badge ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </span>
          {isOverdue && invoice.status !== 'paid' && (
            <span className="badge bg-red-100 text-red-700">Overdue</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-gray-200 flex space-x-2">
        <button onClick={onEdit} className="btn btn-secondary flex-1 text-sm">
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </button>
        {balance > 0 && (
          <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary flex-1 text-sm">
            <CreditCard className="w-4 h-4 mr-1" />
            Record Payment
          </button>
        )}
        <button onClick={onDelete} className="btn btn-danger text-sm px-3">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Amount Summary */}
      <div className="p-4 border-b border-gray-200">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Total</span>
            <span className="text-xl font-bold text-gray-900">${invoice.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Paid</span>
            <span className="text-green-600">${(invoice.paid_amount || 0).toLocaleString()}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-medium text-gray-700">Balance Due</span>
            <span className={`text-lg font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              ${balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="p-4 border-b border-gray-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Issue Date</p>
          <p className="font-medium text-gray-900">
            {format(parseISO(invoice.issue_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Due Date</p>
          <p className={`font-medium ${isOverdue && invoice.status !== 'paid' ? 'text-red-600' : 'text-gray-900'}`}>
            {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Line Items & Payments */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Line Items ({items.length})</h3>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No line items</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <p className="font-medium text-gray-900 text-sm">{item.description}</p>
                        <p className="font-medium text-gray-900 text-sm">${item.amount.toLocaleString()}</p>
                      </div>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.quantity} × ${item.unit_price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Payments ({payments.length})</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-500">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div key={payment.id} className="bg-green-50 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-green-700">${payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-green-600">
                            {format(parseISO(payment.payment_date), 'MMM d, yyyy')} • {payment.payment_method}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          balance={balance}
          onClose={() => setShowPaymentModal(false)}
          onSave={() => {
            setShowPaymentModal(false);
            loadInvoiceData();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

// Payment Modal
interface PaymentModalProps {
  invoice: Invoice;
  balance: number;
  onClose: () => void;
  onSave: () => void;
}

function PaymentModal({ invoice, balance, onClose, onSave }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: balance.toString(),
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'bank_transfer',
    reference: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await invoicesService.addPayment(invoice.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      onSave();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 z-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Amount *</label>
              <input
                type="number"
                step="0.01"
                max={balance}
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Balance: ${balance.toLocaleString()}</p>
            </div>
            <div>
              <label className="label">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="input"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Reference</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="input"
                placeholder="Transaction ID, check #, etc."
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Invoice Modal
interface InvoiceModalProps {
  invoice: Invoice | null;
  clients: Client[];
  projects: Project[];
  onClose: () => void;
  onSave: () => void;
}

function InvoiceModal({ invoice, clients, projects, onClose, onSave }: InvoiceModalProps) {
  const [formData, setFormData] = useState({
    client_id: invoice?.client_id?.toString() || '',
    project_id: invoice?.project_id?.toString() || '',
    status: invoice?.status || 'draft',
    issue_date: invoice?.issue_date || format(new Date(), 'yyyy-MM-dd'),
    due_date: invoice?.due_date || '',
    notes: invoice?.notes || '',
  });
  const [items, setItems] = useState<{ description: string; quantity: string; unit_price: string }[]>(
    [{ description: '', quantity: '1', unit_price: '' }]
  );
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', unit_price: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const total = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const invoiceData = {
        ...formData,
        client_id: formData.client_id ? parseInt(formData.client_id) : undefined,
        project_id: formData.project_id ? parseInt(formData.project_id) : undefined,
        items: items
          .filter((i) => i.description && i.unit_price)
          .map((i) => ({
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unit_price: parseFloat(i.unit_price),
          })),
      };
      
      if (invoice) {
        await invoicesService.update(invoice.id, invoiceData);
      } else {
        await invoicesService.create(invoiceData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save invoice:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {invoice ? 'Edit Invoice' : 'New Invoice'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Project</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
                  className="input"
                >
                  {statusOptions.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Line Items</label>
                <button type="button" onClick={addItem} className="text-sm text-orange-500 hover:text-orange-600">
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="input flex-1"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="input w-20"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                      className="input w-28"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t">
                <div className="text-right">
                  <span className="text-gray-600">Total: </span>
                  <span className="text-xl font-bold text-gray-900">${total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : invoice ? 'Update' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
