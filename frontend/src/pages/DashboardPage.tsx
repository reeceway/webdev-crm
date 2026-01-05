import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Users,
  FolderKanban,
  DollarSign,
  Target,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Calendar,
  Check,
  Circle,
} from 'lucide-react';
import { dashboardService, tasksService } from '../services';
import type { DashboardData, Task } from '../types';
import { format, isToday, isPast, parseISO } from 'date-fns';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, tasksData] = await Promise.all([
        dashboardService.getOverview(),
        tasksService.getMy(),
      ]);
      setDashboard(dashboardData);
      setTasks(tasksData.tasks.slice(0, 10));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await tasksService.complete(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      loadData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTaskDueStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'text-red-600' };
    }
    if (isToday(date)) {
      return { label: 'Today', className: 'text-orange-600' };
    }
    return { label: format(date, 'MMM d'), className: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your business today.</p>
        </div>
        <Link
          to="/tasks/new"
          className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
        >
          <CheckSquare className="w-4 h-4 mr-2 inline" />
          Add Task
        </Link>
      </div>

      {/* Urgent Alerts */}
      {dashboard && (dashboard.urgent.overdueTasks > 0 || dashboard.urgent.overdueInvoices > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Attention Required</h3>
              <div className="mt-1 text-sm text-red-700 space-x-4">
                {dashboard.urgent.overdueTasks > 0 && (
                  <Link to="/tasks?overdue=true" className="hover:underline">
                    {dashboard.urgent.overdueTasks} overdue task{dashboard.urgent.overdueTasks > 1 ? 's' : ''}
                  </Link>
                )}
                {dashboard.urgent.overdueInvoices > 0 && (
                  <Link to="/invoices?status=overdue" className="hover:underline">
                    {dashboard.urgent.overdueInvoices} overdue invoice{dashboard.urgent.overdueInvoices > 1 ? 's' : ''}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Panel - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-orange-500 to-pink-500 text-white">
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 opacity-80" />
                <span className="text-3xl font-bold">{dashboard?.urgent.tasksDueToday || 0}</span>
              </div>
              <p className="mt-2 text-sm opacity-90">Due Today</p>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <CheckSquare className="w-8 h-8 text-blue-500" />
                <span className="text-3xl font-bold text-gray-900">{dashboard?.counts.pendingTasks || 0}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Pending Tasks</p>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <FolderKanban className="w-8 h-8 text-purple-500" />
                <span className="text-3xl font-bold text-gray-900">{dashboard?.counts.activeProjects || 0}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Active Projects</p>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <Target className="w-8 h-8 text-green-500" />
                <span className="text-3xl font-bold text-gray-900">{dashboard?.counts.openLeads || 0}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Open Leads</p>
            </div>
          </div>

          {/* My Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
              <Link to="/tasks" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No pending tasks. Great job!</p>
                <Link to="/tasks/new" className="text-orange-500 hover:underline text-sm mt-2 inline-block">
                  Add a new task
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const dueStatus = getTaskDueStatus(task.due_date);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 group transition-colors"
                    >
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center group-hover:border-green-400 transition-colors"
                      >
                        <Check className="w-3 h-3 text-transparent group-hover:text-green-500" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="font-medium text-gray-900 hover:text-orange-500 truncate block"
                        >
                          {task.title}
                        </Link>
                        {task.project_name && (
                          <p className="text-sm text-gray-500 truncate">{task.project_name}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {dueStatus && (
                          <span className={`text-sm font-medium ${dueStatus.className}`}>
                            {dueStatus.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Financial Overview */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(dashboard?.financial.totalRevenue || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">This Month</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(dashboard?.financial.thisMonthRevenue || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Pending</span>
                <span className="font-semibold text-orange-600">
                  {formatCurrency(dashboard?.financial.pendingPayments || 0)}
                </span>
              </div>
              {dashboard?.financial.overdueAmount ? (
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-red-600">Overdue</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(dashboard.financial.overdueAmount)}
                  </span>
                </div>
              ) : null}
            </div>
            <Link
              to="/invoices"
              className="mt-4 block text-center text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              View Invoices →
            </Link>
          </div>

          {/* Pipeline */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Pipeline Value</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(dashboard?.pipeline.totalValue || 0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Weighted Value</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(dashboard?.pipeline.weightedValue || 0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    style={{
                      width: dashboard?.pipeline.totalValue
                        ? `${(dashboard.pipeline.weightedValue / dashboard.pipeline.totalValue) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t flex items-center justify-between">
                <span className="text-gray-500">Won This Month</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(dashboard?.pipeline.wonThisMonth || 0)}
                </span>
              </div>
            </div>
            <Link
              to="/leads"
              className="mt-4 block text-center text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              View Leads →
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <Link
                to="/clients"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Total Clients</span>
                </div>
                <span className="font-semibold text-gray-900">{dashboard?.counts.clients || 0}</span>
              </Link>
              <Link
                to="/companies"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Circle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Companies</span>
                </div>
                <span className="font-semibold text-gray-900">{dashboard?.counts.companies || 0}</span>
              </Link>
              <Link
                to="/invoices?status=unpaid"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Unpaid Invoices</span>
                </div>
                <span className="font-semibold text-gray-900">{dashboard?.counts.unpaidInvoices || 0}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
