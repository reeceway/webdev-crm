import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Check,
  Clock,
  AlertTriangle,
  Calendar,
  MoreHorizontal,
  Edit2,
  Trash2,
  ChevronDown,
  X,
} from 'lucide-react';
import { tasksService, projectsService } from '../services';
import type { Task, TaskStatus, Priority, Project } from '../types';
import { format, parseISO, isToday, isPast, isTomorrow } from 'date-fns';

const statusOptions: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: { value: Priority | ''; label: string }[] = [
  { value: '', label: 'All Priority' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [search, statusFilter, priorityFilter, showOverdue]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, projectsData] = await Promise.all([
        tasksService.getAll({
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          overdue: showOverdue ? true : undefined,
        }),
        projectsService.getAll({ status: 'in_progress' }),
      ]);
      setTasks(tasksData.tasks);
      setProjects(projectsData.projects);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId: number) => {
    try {
      await tasksService.complete(taskId);
      loadData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksService.delete(taskId);
      loadData();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getDueLabel = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'text-red-600 bg-red-50', icon: AlertTriangle };
    }
    if (isToday(date)) {
      return { label: 'Today', className: 'text-orange-600 bg-orange-50', icon: Clock };
    }
    if (isTomorrow(date)) {
      return { label: 'Tomorrow', className: 'text-blue-600 bg-blue-50', icon: Calendar };
    }
    return { label: format(date, 'MMM d'), className: 'text-gray-600 bg-gray-50', icon: Calendar };
  };

  // Group tasks by status for the view
  const groupedTasks = {
    overdue: tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== 'completed'),
    today: tasks.filter((t) => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'completed'),
    upcoming: tasks.filter((t) => {
      if (!t.due_date || t.status === 'completed') return false;
      const date = parseISO(t.due_date);
      return !isPast(date) && !isToday(date);
    }),
    noDue: tasks.filter((t) => !t.due_date && t.status !== 'completed'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage your tasks and stay on top of deadlines</p>
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2 inline" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
            className="input w-full lg:w-40"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
            className="input w-full lg:w-40"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Overdue Toggle */}
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            className={`btn ${showOverdue ? 'bg-red-100 text-red-700 border-red-200' : 'btn-secondary'} border`}
          >
            <AlertTriangle className="w-4 h-4 mr-2 inline" />
            Overdue
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first task</p>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {groupedTasks.overdue.length > 0 && (
            <TaskSection
              title="Overdue"
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              tasks={groupedTasks.overdue}
              badgeClass="bg-red-100 text-red-700"
              onComplete={handleComplete}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              getPriorityColor={getPriorityColor}
              getDueLabel={getDueLabel}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />
          )}

          {/* Today Section */}
          {groupedTasks.today.length > 0 && (
            <TaskSection
              title="Today"
              icon={<Clock className="w-5 h-5 text-orange-500" />}
              tasks={groupedTasks.today}
              badgeClass="bg-orange-100 text-orange-700"
              onComplete={handleComplete}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              getPriorityColor={getPriorityColor}
              getDueLabel={getDueLabel}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />
          )}

          {/* Upcoming Section */}
          {groupedTasks.upcoming.length > 0 && (
            <TaskSection
              title="Upcoming"
              icon={<Calendar className="w-5 h-5 text-blue-500" />}
              tasks={groupedTasks.upcoming}
              badgeClass="bg-blue-100 text-blue-700"
              onComplete={handleComplete}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              getPriorityColor={getPriorityColor}
              getDueLabel={getDueLabel}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />
          )}

          {/* No Due Date Section */}
          {groupedTasks.noDue.length > 0 && (
            <TaskSection
              title="No Due Date"
              icon={<Check className="w-5 h-5 text-gray-400" />}
              tasks={groupedTasks.noDue}
              badgeClass="bg-gray-100 text-gray-700"
              onComplete={handleComplete}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              getPriorityColor={getPriorityColor}
              getDueLabel={getDueLabel}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />
          )}

          {/* Completed Section */}
          {groupedTasks.completed.length > 0 && statusFilter === 'completed' && (
            <TaskSection
              title="Completed"
              icon={<Check className="w-5 h-5 text-green-500" />}
              tasks={groupedTasks.completed}
              badgeClass="bg-green-100 text-green-700"
              onComplete={handleComplete}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              getPriorityColor={getPriorityColor}
              getDueLabel={getDueLabel}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              isCompleted
            />
          )}
        </div>
      )}

      {/* New/Edit Task Modal */}
      {(showNewTaskModal || editingTask) && (
        <TaskModal
          task={editingTask}
          projects={projects}
          onClose={() => {
            setShowNewTaskModal(false);
            setEditingTask(null);
          }}
          onSave={() => {
            setShowNewTaskModal(false);
            setEditingTask(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Task Section Component
interface TaskSectionProps {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  badgeClass: string;
  onComplete: (id: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  getPriorityColor: (priority: string) => string;
  getDueLabel: (dueDate?: string) => { label: string; className: string; icon: any } | null;
  menuOpen: number | null;
  setMenuOpen: (id: number | null) => void;
  isCompleted?: boolean;
}

function TaskSection({
  title,
  icon,
  tasks,
  badgeClass,
  onComplete,
  onEdit,
  onDelete,
  getPriorityColor,
  getDueLabel,
  menuOpen,
  setMenuOpen,
  isCompleted,
}: TaskSectionProps) {
  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className={`badge ${badgeClass}`}>{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const dueInfo = getDueLabel(task.due_date);
          return (
            <div
              key={task.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 group transition-all ${
                isCompleted ? 'opacity-60' : ''
              }`}
            >
              {/* Complete Button */}
              <button
                onClick={() => onComplete(task.id)}
                disabled={isCompleted}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCompleted
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <Check className={`w-3 h-3 ${isCompleted ? 'text-white' : 'text-transparent group-hover:text-green-500'}`} />
              </button>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </span>
                  <span className={`badge border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                  {task.project_name && <span>{task.project_name}</span>}
                  {task.client_name && <span>• {task.client_name}</span>}
                </div>
              </div>

              {/* Due Date */}
              {dueInfo && !isCompleted && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${dueInfo.className}`}>
                  <dueInfo.icon className="w-4 h-4" />
                  <span>{dueInfo.label}</span>
                </div>
              )}

              {/* Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === task.id ? null : task.id)}
                  className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
                {menuOpen === task.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                        onClick={() => {
                          setMenuOpen(null);
                          onEdit(task);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        onClick={() => {
                          setMenuOpen(null);
                          onDelete(task.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Task Modal Component
interface TaskModalProps {
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onSave: () => void;
}

function TaskModal({ task, projects, onClose, onSave }: TaskModalProps) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    project_id: task?.project_id?.toString() || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'pending',
    due_date: task?.due_date || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        project_id: formData.project_id ? parseInt(formData.project_id) : undefined,
      };
      if (task) {
        await tasksService.update(task.id, data);
      } else {
        await tasksService.create(data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Add details about this task"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Project</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="input"
                >
                  <option value="">No Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="input"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
              >
                {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
