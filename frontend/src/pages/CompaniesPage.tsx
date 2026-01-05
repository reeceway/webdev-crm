import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  Users,
  FolderOpen,
  DollarSign,
} from 'lucide-react';
import { companiesService, clientsService, projectsService } from '../services';
import type { Company, Client, Project } from '../types';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, [search]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await companiesService.getAll({ search: search || undefined });
      setCompanies(data.companies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId: number) => {
    if (!confirm('Are you sure you want to delete this company? This will not delete associated clients.')) return;
    try {
      await companiesService.delete(companyId);
      loadCompanies();
      if (selectedCompany?.id === companyId) setSelectedCompany(null);
    } catch (error) {
      console.error('Failed to delete company:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main List */}
      <div className={`flex-1 flex flex-col ${selectedCompany ? 'hidden lg:flex' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-500 mt-1">Manage your client organizations</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Add Company
          </button>
        </div>

        {/* Search */}
        <div className="card mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Companies List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="card text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-500 mb-4">Add your first company to organize clients</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2 inline" />
                Add Company
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className={`card cursor-pointer hover:border-orange-300 transition-colors ${
                    selectedCompany?.id === company.id ? 'border-orange-500 bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{company.name}</h3>
                        {company.industry && (
                          <p className="text-sm text-gray-500">{company.industry}</p>
                        )}
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-orange-500 hover:text-orange-600 flex items-center"
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            Website
                          </a>
                        )}
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

      {/* Company Detail Panel */}
      {selectedCompany && (
        <CompanyDetailPanel
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onEdit={() => setEditingCompany(selectedCompany)}
          onDelete={() => handleDelete(selectedCompany.id)}
        />
      )}

      {/* Modal */}
      {(showModal || editingCompany) && (
        <CompanyModal
          company={editingCompany}
          onClose={() => {
            setShowModal(false);
            setEditingCompany(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingCompany(null);
            loadCompanies();
          }}
        />
      )}
    </div>
  );
}

// Company Detail Panel
interface CompanyDetailPanelProps {
  company: Company;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CompanyDetailPanel({ company, onClose, onEdit, onDelete }: CompanyDetailPanelProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyData();
  }, [company.id]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      const [clientsData, projectsData] = await Promise.all([
        clientsService.getAll({ company_id: company.id }),
        projectsService.getAll({ company_id: company.id }),
      ]);
      setClients(clientsData.clients);
      setProjects(projectsData.projects);
    } catch (error) {
      console.error('Failed to load company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const activeProjects = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="w-full lg:w-[400px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
              {company.industry && <p className="text-gray-500 text-sm">{company.industry}</p>}
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
        {company.email && (
          <a href={`mailto:${company.email}`} className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Mail className="w-4 h-4 mr-2 text-gray-400" />
            {company.email}
          </a>
        )}
        {company.phone && (
          <a href={`tel:${company.phone}`} className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Phone className="w-4 h-4 mr-2 text-gray-400" />
            {company.phone}
          </a>
        )}
        {company.website && (
          <a href={company.website} target="_blank" rel="noopener" className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Globe className="w-4 h-4 mr-2 text-gray-400" />
            {company.website}
          </a>
        )}
        {company.address && (
          <p className="flex items-start text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
            {company.address}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-200 grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-blue-700">{clients.length}</p>
          <p className="text-xs text-blue-600">Contacts</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <FolderOpen className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-green-700">{activeProjects}</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <DollarSign className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-purple-700">${(totalValue / 1000).toFixed(0)}k</p>
          <p className="text-xs text-purple-600">Total Value</p>
        </div>
      </div>

      {/* Clients & Projects */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Contacts ({clients.length})
              </h3>
              {clients.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts yet</p>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <div key={client.id} className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                        {client.email && <p className="text-xs text-gray-500">{client.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <FolderOpen className="w-4 h-4 mr-2" />
                Projects ({projects.length})
              </h3>
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500">No projects yet</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`badge text-xs ${
                          project.status === 'active' ? 'bg-green-100 text-green-700' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          project.status === 'proposal' ? 'bg-yellow-100 text-yellow-700' :
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
          </>
        )}
      </div>
    </div>
  );
}

// Company Modal
interface CompanyModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: () => void;
}

function CompanyModal({ company, onClose, onSave }: CompanyModalProps) {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    industry: company?.industry || '',
    website: company?.website || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address: company?.address || '',
    notes: company?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (company) {
        await companiesService.update(company.id, formData);
      } else {
        await companiesService.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save company:', error);
    } finally {
      setSaving(false);
    }
  };

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Real Estate', 'Education', 'Legal', 'Restaurant', 'Hospitality',
    'Construction', 'Non-profit', 'Other',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {company ? 'Edit Company' : 'New Company'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Company Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Industry</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="input"
              >
                <option value="">Select industry</option>
                {industries.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input"
                placeholder="https://"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="label">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                rows={2}
              />
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
                {saving ? 'Saving...' : company ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
