import { useState, useEffect } from 'react';
import { 
  Plus, Search, DollarSign, Calendar, User, Building2, 
  ChevronRight, MoreVertical, Edit, Trash2, ArrowRight,
  TrendingUp, Target, X
} from 'lucide-react';
import { pipelineService, PipelineDeal, PipelineStage } from '../services/pipeline';

const STAGES = [
  { id: 'qualification', name: 'Qualification', color: 'bg-gray-500' },
  { id: 'meeting', name: 'Meeting', color: 'bg-blue-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-yellow-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed_won', name: 'Won', color: 'bg-green-500' },
  { id: 'closed_lost', name: 'Lost', color: 'bg-red-500' },
];

export default function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<PipelineDeal | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    deal_name: '',
    deal_value: '',
    stage: 'qualification',
    expected_close_date: '',
    source: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dealsRes, stagesRes] = await Promise.all([
        pipelineService.getAll({ search: search || undefined }),
        pipelineService.getStages()
      ]);
      setDeals(dealsRes.deals);
      setStages(stagesRes.stages);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        deal_value: parseFloat(formData.deal_value) || 0
      };

      if (editingDeal) {
        await pipelineService.update(editingDeal.id, data);
      } else {
        await pipelineService.create(data);
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving deal:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      await pipelineService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
  };

  const handleStageChange = async (dealId: number, newStage: string) => {
    try {
      await pipelineService.updateStage(dealId, newStage);
      fetchData();
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      deal_name: '',
      deal_value: '',
      stage: 'qualification',
      expected_close_date: '',
      source: '',
      notes: ''
    });
    setEditingDeal(null);
  };

  const openEditModal = (deal: PipelineDeal) => {
    setEditingDeal(deal);
    setFormData({
      company_name: deal.company_name,
      contact_name: deal.contact_name || '',
      contact_email: deal.contact_email || '',
      contact_phone: deal.contact_phone || '',
      deal_name: deal.deal_name,
      deal_value: deal.deal_value.toString(),
      stage: deal.stage,
      expected_close_date: deal.expected_close_date || '',
      source: deal.source || '',
      notes: deal.notes || ''
    });
    setShowModal(true);
  };

  const totalValue = stages.reduce((sum, s) => s.id !== 'closed_lost' ? sum + s.total_value : sum, 0);
  const weightedValue = deals.reduce((sum, d) => d.stage !== 'closed_lost' ? sum + (d.deal_value * d.probability / 100) : sum, 0);

  const getStageDeals = (stageId: string) => deals.filter(d => d.stage === stageId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-500">Track and manage your deals</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Deal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pipeline</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Weighted Value</p>
              <p className="text-2xl font-bold text-gray-900">${weightedValue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">{deals.filter(d => !d.stage.startsWith('closed')).length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Won This Month</p>
              <p className="text-2xl font-bold text-green-600">
                ${stages.find(s => s.id === 'closed_won')?.total_value.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'kanban' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.filter(s => s.id !== 'closed_lost').map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`${stage.color} text-white px-4 py-2 rounded-t-lg font-medium flex justify-between items-center`}>
                <span>{stage.name}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                  {getStageDeals(stage.id).length}
                </span>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {getStageDeals(stage.id).map(deal => (
                  <div
                    key={deal.id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openEditModal(deal)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{deal.deal_name}</h4>
                      <span className="text-green-600 font-semibold text-sm">
                        ${deal.deal_value.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{deal.company_name}</p>
                    {deal.contact_name && (
                      <p className="text-xs text-gray-400 flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {deal.contact_name}
                      </p>
                    )}
                    {stage.id !== 'closed_won' && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-1">
                        {STAGES.filter(s => STAGES.indexOf(s) > STAGES.findIndex(st => st.id === stage.id) && s.id !== 'closed_lost').slice(0, 1).map(nextStage => (
                          <button
                            key={nextStage.id}
                            onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, nextStage.id); }}
                            className="text-xs text-orange-500 hover:text-orange-600 flex items-center"
                          >
                            Move to {nextStage.name} <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deals.map(deal => {
                const stageInfo = STAGES.find(s => s.id === deal.stage);
                return (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{deal.deal_name}</div>
                      {deal.contact_name && (
                        <div className="text-sm text-gray-500">{deal.contact_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{deal.company_name}</td>
                    <td className="px-6 py-4 text-green-600 font-medium">${deal.deal_value.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <select
                        value={deal.stage}
                        onChange={(e) => handleStageChange(deal.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full text-white ${stageInfo?.color}`}
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full" 
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{deal.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(deal)}
                        className="text-gray-400 hover:text-orange-500 mr-2"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(deal.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingDeal ? 'Edit Deal' : 'Add New Deal'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
                  <input
                    type="text"
                    value={formData.deal_name}
                    onChange={(e) => setFormData({ ...formData, deal_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value ($)</label>
                  <input
                    type="number"
                    value={formData.deal_value}
                    onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Referral, Website, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingDeal ? 'Update' : 'Create'} Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
