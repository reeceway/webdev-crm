import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Users,
  Building2,
  Mail,
  Phone,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  DollarSign,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { clientsService, companiesService, projectsService, invoicesService } from '../services';
import type { Client, Company, Project, Invoice } from '../types';
import { format, parseISO } from 'date-fns';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadData();
  }, [search, companyFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, companiesData] = await Promise.all([
        clientsService.getAll({
          search: search || undefined,
          company_id: companyFilter ? parseInt(companyFilter) : undefined,
        }),
        companiesService.getAll(),
      ]);
      setClients(clientsData.clients);
      setCompanies(companiesData.companies);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (clientId: number) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await clientsService.delete(clientId);
      loadData();
      if (selectedClient?.id === clientId) setSelectedClient(null);
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return null;
    return companies.find((c) => c.id === companyId)?.name;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main List */}
      <div className={`flex-1 flex flex-col ${selectedClient ? 'hidden lg:flex' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">Manage your client contacts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Add Client
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="input w-full sm:w-48"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clients List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">Add your first client to get started</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Client
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`card cursor-pointer hover:border-orange-300 transition-colors ${
                    selectedClient?.id === client.id ? 'border-orange-500 bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white font-medium">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{client.name}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          {getCompanyName(client.company_id) && (
                            <span className="flex items-center">
                              <Building2 className="w-4 h-4 mr-1" />
                              {getCompanyName(client.company_id)}
                            </span>
                          )}
                          {client.email && (
                            <span className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {client.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Detail Panel */}
      {selectedClient && (
        <ClientDetailPanel
          client={selectedClient}
          companyName={getCompanyName(selectedClient.company_id)}
          onClose={() => setSelectedClient(null)}
          onEdit={() => setEditingClient(selectedClient)}
          onDelete={() => handleDelete(selectedClient.id)}
        />
      )}

      {/* Modal */}
      {(showModal || editingClient) && (
        <ClientModal
          client={editingClient}
          companies={companies}
          onClose={() => {
            setShowModal(false);
            setEditingClient(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingClient(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Client Detail Panel
interface ClientDetailPanelProps {
  client: Client;
  companyName: string | null | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientDetailPanel({ client, companyName, onClose, onEdit, onDelete }: ClientDetailPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [client.id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const [projectsData, invoicesData] = await Promise.all([
        projectsService.getAll({ client_id: client.id }),
        invoicesService.getAll({ client_id: client.id }),
      ]);
      setProjects(projectsData.projects);
      setInvoices(invoicesData.invoices);
    } catch (error) {
      console.error('Failed to load client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_amount, 0);

  const activeProjects = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="w-full lg:w-[400px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white text-lg font-medium">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{client.name}</h2>
              {companyName && <p className="text-gray-500 text-sm">{companyName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-gray-200 flex space-x-2">
        <button onClick={onEdit} className="btn btn-secondary flex-1 text-sm">
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </button>
        <button onClick={onDelete} className="btn btn-danger text-sm px-3">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Contact Info */}
      <div className="p-4 border-b border-gray-200 space-y-2">
        {client.email && (
          <a href={`mailto:${client.email}`} className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Mail className="w-4 h-4 mr-2 text-gray-400" />
            {client.email}
          </a>
        )}
        {client.phone && (
          <a href={`tel:${client.phone}`} className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Phone className="w-4 h-4 mr-2 text-gray-400" />
            {client.phone}
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-200 grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-sm text-green-600">Total Revenue</p>
          <p className="text-lg font-semibold text-green-700">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-600">Active Projects</p>
          <p className="text-lg font-semibold text-blue-700">{activeProjects}</p>
        </div>
      </div>

      {/* Projects & Invoices */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <FolderOpen className="w-4 h-4 mr-2" />
                Projects ({projects.length})
              </h3>
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500">No projects yet</p>
              ) : (
                <div className="space-y-2">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`badge text-xs ${
                          project.status === 'active' ? 'bg-green-100 text-green-700' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {project.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          ${project.budget?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Recent Invoices ({invoices.length})
              </h3>
              {invoices.length === 0 ? (
                <p className="text-sm text-gray-500">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm">{invoice.invoice_number}</p>
                        <span className={`badge text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        ${invoice.total_amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Client Modal
interface ClientModalProps {
  client: Client | null;
  companies: Company[];
  onClose: () => void;
  onSave: () => void;
}

function ClientModal({ client, companies, onClose, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    company_id: client?.company_id?.toString() || '',
    notes: client?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        company_id: formData.company_id ? parseInt(formData.company_id) : undefined,
      };
      if (client) {
        await clientsService.update(client.id, data);
      } else {
        await clientsService.create(data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save client:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {client ? 'Edit Client' : 'New Client'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Company</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="input"
              >
                <option value="">No company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : client ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
