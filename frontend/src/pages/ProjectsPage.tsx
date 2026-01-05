import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FolderOpen,
  Calendar,
  DollarSign,
  Clock,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  Users,
  Building2,
  CheckCircle,
  PlayCircle,
  FileText,
  ListTodo,
} from 'lucide-react';
import { projectsService, clientsService, companiesService, tasksService } from '../services';
import type { Project, Client, Company, Task, ProjectStatus } from '../types';
import { format, parseISO, differenceInDays } from 'date-fns';

const statusOptions: { value: ProjectStatus | ''; label: string; color: string }[] = [
  { value: '', label: 'All Status', color: '' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, clientsData, companiesData] = await Promise.all([
        projectsService.getAll({
          search: search || undefined,
          status: statusFilter || undefined,
        }),
        clientsService.getAll(),
        companiesService.getAll(),
      ]);
      setProjects(projectsData.projects);
      setClients(clientsData.clients);
      setCompanies(companiesData.companies);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsService.delete(projectId);
      loadData();
      if (selectedProject?.id === projectId) setSelectedProject(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getClientName = (clientId?: number) => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.name;
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return null;
    return companies.find((c) => c.id === companyId)?.name;
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700';
  };

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const days = differenceInDays(parseISO(deadline), new Date());
    return days;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main List */}
      <div className={`flex-1 flex flex-col ${selectedProject ? 'hidden lg:flex' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 mt-1">Track your client projects</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
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

        {/* Projects List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="card text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500 mb-4">Create your first project</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2 inline" />
                New Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const daysRemaining = getDaysRemaining(project.deadline);
                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`card cursor-pointer hover:border-orange-300 transition-colors ${
                      selectedProject?.id === project.id ? 'border-orange-500 bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                          <span className={`badge ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          {getClientName(project.client_id) && (
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {getClientName(project.client_id)}
                            </span>
                          )}
                          {getCompanyName(project.company_id) && (
                            <span className="flex items-center">
                              <Building2 className="w-4 h-4 mr-1" />
                              {getCompanyName(project.company_id)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ${project.budget?.toLocaleString() || 0}
                          </p>
                          {project.hourly_rate && (
                            <p className="text-sm text-gray-500">${project.hourly_rate}/hr</p>
                          )}
                        </div>
                        {daysRemaining !== null && (
                          <div className={`text-sm ${
                            daysRemaining < 0 ? 'text-red-600' :
                            daysRemaining <= 7 ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` :
                             daysRemaining === 0 ? 'Due today' :
                             `${daysRemaining}d left`}
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project Detail Panel */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          clientName={getClientName(selectedProject.client_id)}
          companyName={getCompanyName(selectedProject.company_id)}
          onClose={() => setSelectedProject(null)}
          onEdit={() => setEditingProject(selectedProject)}
          onDelete={() => handleDelete(selectedProject.id)}
          onUpdate={loadData}
        />
      )}

      {/* Modal */}
      {(showModal || editingProject) && (
        <ProjectModal
          project={editingProject}
          clients={clients}
          companies={companies}
          onClose={() => {
            setShowModal(false);
            setEditingProject(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingProject(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Project Detail Panel
interface ProjectDetailPanelProps {
  project: Project;
  clientName: string | null | undefined;
  companyName: string | null | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

function ProjectDetailPanel({ project, clientName, companyName, onClose, onEdit, onDelete, onUpdate }: ProjectDetailPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHoursModal, setShowHoursModal] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [project.id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const tasksData = await tasksService.getAll({ project_id: project.id });
      setTasks(tasksData.tasks);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      proposal: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      on_hold: 'bg-orange-100 text-orange-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-full lg:w-[420px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`badge ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        {(clientName || companyName) && (
          <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
            {clientName && (
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {clientName}
              </span>
            )}
            {companyName && (
              <span className="flex items-center">
                <Building2 className="w-4 h-4 mr-1" />
                {companyName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-gray-200 flex space-x-2">
        <button onClick={onEdit} className="btn btn-secondary flex-1 text-sm">
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </button>
        <button onClick={() => setShowHoursModal(true)} className="btn btn-secondary flex-1 text-sm">
          <Clock className="w-4 h-4 mr-1" />
          Log Hours
        </button>
        <button onClick={onDelete} className="btn btn-danger text-sm px-3">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{completedTasks}/{totalTasks} tasks</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Project Info */}
      <div className="p-4 border-b border-gray-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Budget</p>
          <p className="font-medium text-gray-900">${project.budget?.toLocaleString() || 0}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Hourly Rate</p>
          <p className="font-medium text-gray-900">${project.hourly_rate || 0}/hr</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Hours Logged</p>
          <p className="font-medium text-gray-900">{project.hours_logged || 0}h</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Deadline</p>
          <p className="font-medium text-gray-900">
            {project.deadline ? format(parseISO(project.deadline), 'MMM d, yyyy') : 'No deadline'}
          </p>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <p className="text-sm text-gray-600">{project.description}</p>
        </div>
      )}

      {/* Tasks */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <ListTodo className="w-4 h-4 mr-2" />
          Tasks ({tasks.length})
        </h3>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks yet</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  {task.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due {format(parseISO(task.due_date), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <span className={`badge text-xs ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Hours Modal */}
      {showHoursModal && (
        <LogHoursModal
          project={project}
          onClose={() => setShowHoursModal(false)}
          onSave={() => {
            setShowHoursModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

// Log Hours Modal
interface LogHoursModalProps {
  project: Project;
  onClose: () => void;
  onSave: () => void;
}

function LogHoursModal({ project, onClose, onSave }: LogHoursModalProps) {
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours) return;
    setSaving(true);
    try {
      await projectsService.logHours(project.id, parseFloat(hours));
      onSave();
    } catch (error) {
      console.error('Failed to log hours:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 z-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Hours</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Hours *</label>
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="input"
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                rows={2}
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Log Hours'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Project Modal
interface ProjectModalProps {
  project: Project | null;
  clients: Client[];
  companies: Company[];
  onClose: () => void;
  onSave: () => void;
}

function ProjectModal({ project, clients, companies, onClose, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    client_id: project?.client_id?.toString() || '',
    company_id: project?.company_id?.toString() || '',
    status: project?.status || 'proposal',
    budget: project?.budget?.toString() || '',
    hourly_rate: project?.hourly_rate?.toString() || '',
    start_date: project?.start_date || '',
    deadline: project?.deadline || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        client_id: formData.client_id ? parseInt(formData.client_id) : undefined,
        company_id: formData.company_id ? parseInt(formData.company_id) : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
      };
      if (project) {
        await projectsService.update(project.id, data);
      } else {
        await projectsService.create(data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {project ? 'Edit Project' : 'New Project'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Project Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
              />
            </div>
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
                <label className="label">Company</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="input"
              >
                {statusOptions.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Budget</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="input"
                  placeholder="$"
                />
              </div>
              <div>
                <label className="label">Hourly Rate</label>
                <input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="input"
                  placeholder="$/hr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : project ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
