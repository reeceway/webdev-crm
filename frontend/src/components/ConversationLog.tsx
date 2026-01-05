import { useState, useEffect } from 'react';
import { 
  MessageSquare, Phone, Mail, Video, Users, Calendar,
  Plus, Trash2, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { conversationsService, Conversation } from '../services/conversations';

interface ConversationLogProps {
  leadId?: number;
  pipelineId?: number;
  clientId?: number;
  companyId?: number;
  showHistory?: boolean;
}

const ACTIVITY_ICONS: Record<string, any> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  video_call: Video,
  follow_up: Calendar,
  proposal: MessageSquare,
  other: MessageSquare
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: 'bg-gray-100 text-gray-600',
  call: 'bg-green-100 text-green-600',
  email: 'bg-blue-100 text-blue-600',
  meeting: 'bg-purple-100 text-purple-600',
  video_call: 'bg-indigo-100 text-indigo-600',
  follow_up: 'bg-orange-100 text-orange-600',
  proposal: 'bg-yellow-100 text-yellow-600',
  other: 'bg-gray-100 text-gray-600'
};

const OUTCOME_COLORS: Record<string, string> = {
  positive: 'text-green-600 bg-green-50',
  neutral: 'text-gray-600 bg-gray-50',
  negative: 'text-red-600 bg-red-50',
  no_answer: 'text-yellow-600 bg-yellow-50',
  callback_requested: 'text-blue-600 bg-blue-50',
  meeting_scheduled: 'text-purple-600 bg-purple-50'
};

export default function ConversationLog({ 
  leadId, 
  pipelineId, 
  clientId, 
  companyId,
  showHistory = false 
}: ConversationLogProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  const [formData, setFormData] = useState({
    activity_type: 'note',
    title: '',
    content: '',
    contact_method: '',
    outcome: '',
    next_steps: '',
    follow_up_date: ''
  });

  useEffect(() => {
    fetchConversations();
  }, [leadId, pipelineId, clientId, companyId]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = { lead_id: leadId, pipeline_id: pipelineId, client_id: clientId, company_id: companyId };
      const response = showHistory 
        ? await conversationsService.getHistory(params)
        : await conversationsService.getAll(params);
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    try {
      await conversationsService.create({
        lead_id: leadId,
        pipeline_id: pipelineId,
        client_id: clientId,
        company_id: companyId,
        ...formData
      });
      
      setFormData({
        activity_type: 'note',
        title: '',
        content: '',
        contact_method: '',
        outcome: '',
        next_steps: '',
        follow_up_date: ''
      });
      setShowForm(false);
      fetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await conversationsService.delete(id);
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Conversation Log</h3>
          <span className="text-sm text-gray-500">({conversations.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowForm(!showForm); }}
            className="p-1 text-orange-500 hover:bg-orange-50 rounded"
          >
            <Plus className="w-5 h-5" />
          </button>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          {/* Add Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="note">Note</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="video_call">Video Call</option>
                    <option value="proposal">Proposal</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
                  <select
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Select --</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                    <option value="no_answer">No Answer</option>
                    <option value="callback_requested">Callback Requested</option>
                    <option value="meeting_scheduled">Meeting Scheduled</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="What did you discuss?"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Next Steps</label>
                <input
                  type="text"
                  value={formData.next_steps}
                  onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  placeholder="What's the next action?"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Follow Up Date</label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Add Entry
                </button>
              </div>
            </form>
          )}

          {/* Conversation Timeline */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-sm text-orange-500 hover:underline"
              >
                Add the first note
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => {
                const Icon = ACTIVITY_ICONS[conv.activity_type] || MessageSquare;
                const colorClass = ACTIVITY_COLORS[conv.activity_type] || 'bg-gray-100 text-gray-600';
                
                return (
                  <div key={conv.id} className="flex gap-3 group">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-900 capitalize">
                            {conv.activity_type.replace('_', ' ')}
                          </span>
                          {conv.outcome && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_COLORS[conv.outcome] || ''}`}>
                              {conv.outcome.replace('_', ' ')}
                            </span>
                          )}
                          {showHistory && conv.stage && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {conv.stage}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(conv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{conv.content}</p>
                      {conv.next_steps && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Next:</span> {conv.next_steps}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(conv.created_at)}
                        </span>
                        {conv.created_by_name && (
                          <span>by {conv.created_by_name}</span>
                        )}
                        {conv.follow_up_date && (
                          <span className="text-orange-500">
                            Follow up: {new Date(conv.follow_up_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
