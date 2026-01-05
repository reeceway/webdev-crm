import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Target,
  Phone,
  Mail,
  Globe,
  Building2,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserPlus,
  X,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Send,
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { leadsService, notesService, auditService, placesService } from '../services';
import type { Lead, LeadStatus, Note, NoteType } from '../types';
import type { AuditResult } from '../services/audit';
import type { PlaceResult } from '../services/places';
import { format, parseISO, isPast } from 'date-fns';

const statusOptions: { value: LeadStatus | ''; label: string; color: string }[] = [
  { value: '', label: 'All Status', color: '' },
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-100 text-purple-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-orange-100 text-orange-700' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-pink-100 text-pink-700' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-500' },
];

const sourceOptions = [
  'Website',
  'Referral',
  'LinkedIn',
  'Cold Outreach',
  'Conference',
  'Social Media',
  'Google Ads',
  'Other',
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showLeadFinder, setShowLeadFinder] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    loadLeads();
  }, [search, statusFilter]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await leadsService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setLeads(data.leads);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadsService.delete(leadId);
      loadLeads();
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleConvert = async (leadId: number) => {
    if (!confirm('Convert this lead to a client? This will create a new client and company.')) return;
    try {
      await leadsService.convert(leadId);
      loadLeads();
      setSelectedLead(null);
    } catch (error) {
      console.error('Failed to convert lead:', error);
    }
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main List */}
      <div className={`flex-1 flex flex-col ${selectedLead ? 'hidden lg:flex' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 mt-1">Manage your sales pipeline</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowLeadFinder(true)}
              className="btn btn-secondary border border-gray-300"
            >
              <Sparkles className="w-4 h-4 mr-2 inline text-purple-500" />
              Find Leads
            </button>
            <button
              onClick={() => setShowNewLeadModal(true)}
              className="btn bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
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

        {/* Leads List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="card text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-500 mb-4">Start building your pipeline</p>
              <div className="flex justify-center space-x-3">
                <button onClick={() => setShowLeadFinder(true)} className="btn btn-secondary">
                  <Sparkles className="w-4 h-4 mr-2 inline" />
                  Find Leads
                </button>
                <button onClick={() => setShowNewLeadModal(true)} className="btn btn-primary">
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Lead
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`card cursor-pointer hover:border-orange-300 transition-colors ${
                    selectedLead?.id === lead.id ? 'border-orange-500 bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900 truncate">{lead.contact_name}</h3>
                        <span className={`badge ${getStatusColor(lead.status)}`}>{lead.status}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        {lead.company_name && (
                          <span className="flex items-center">
                            <Building2 className="w-4 h-4 mr-1" />
                            {lead.company_name}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {lead.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(lead.estimated_value)}</p>
                        <p className="text-sm text-gray-500">{lead.probability}% probability</p>
                      </div>
                      {lead.next_follow_up && (
                        <div
                          className={`text-sm ${
                            isPast(parseISO(lead.next_follow_up)) ? 'text-red-600' : 'text-gray-500'
                          }`}
                        >
                          <Clock className="w-4 h-4 inline mr-1" />
                          {format(parseISO(lead.next_follow_up), 'MMM d')}
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEdit={() => setEditingLead(selectedLead)}
          onConvert={() => handleConvert(selectedLead.id)}
          onDelete={() => handleDelete(selectedLead.id)}
          onUpdate={loadLeads}
        />
      )}

      {/* New/Edit Lead Modal */}
      {(showNewLeadModal || editingLead) && (
        <LeadModal
          lead={editingLead}
          onClose={() => {
            setShowNewLeadModal(false);
            setEditingLead(null);
          }}
          onSave={() => {
            setShowNewLeadModal(false);
            setEditingLead(null);
            loadLeads();
          }}
        />
      )}

      {/* Lead Finder Modal */}
      {showLeadFinder && (
        <LeadFinderModal
          onClose={() => setShowLeadFinder(false)}
          onAddLead={(leadData) => {
            setShowLeadFinder(false);
            setShowNewLeadModal(true);
            // Pre-fill form would happen through state
          }}
        />
      )}
    </div>
  );
}

// Lead Detail Panel with Audit/Notes
interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

function LeadDetailPanel({ lead, onClose, onEdit, onConvert, onDelete, onUpdate }: LeadDetailPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', note_type: 'general' as NoteType, title: '' });
  const [auditResults, setAuditResults] = useState<AuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [lead.id]);

  const loadNotes = async () => {
    try {
      setLoadingNotes(true);
      const data = await notesService.getAll({ lead_id: lead.id });
      setNotes(data.notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) return;
    try {
      await notesService.create({
        lead_id: lead.id,
        ...newNote,
      });
      setNewNote({ content: '', note_type: 'general', title: '' });
      setShowNoteForm(false);
      loadNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const runLeadAudit = async () => {
    if (!lead.website) {
      setAuditError('No website URL available for this lead');
      return;
    }
    
    setAuditing(true);
    setAuditError(null);
    
    try {
      const results = await auditService.runAudit(lead.website);
      setAuditResults(results);
    } catch (error: any) {
      console.error('Audit failed:', error);
      setAuditError(error.response?.data?.error || 'Failed to run audit. The website may be unreachable.');
    } finally {
      setAuditing(false);
    }
  };

  const saveAuditAsNote = async () => {
    if (!auditResults) return;
    
    const checksContent = auditResults.checks.map((check: any) => {
      const statusIcon = check.passed ? '✅' : '❌';
      return `${statusIcon} **${check.name}:** ${check.value || (check.passed ? 'Pass' : 'Fail')}${check.message ? ` - ${check.message}` : ''}`;
    }).join('\n');
    
    const recsContent = auditResults.recommendations
      .sort((a: any, b: any) => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .map((rec: any) => {
        const priorityEmoji = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : rec.priority === 'medium' ? '🟡' : '🟢';
        return `${priorityEmoji} **[${rec.priority.toUpperCase()}]** ${rec.message}`;
      }).join('\n');
    
    const noteContent = `
## SEO Audit Results - ${auditResults.url}

**Overall Score:** ${auditResults.score}/100 (Grade: ${auditResults.grade})
**Response Time:** ${auditResults.responseTime}ms
**Audit Date:** ${new Date(auditResults.timestamp).toLocaleString()}

### Checks Performed
${checksContent}

### Recommendations
${recsContent || 'No recommendations - site looks good!'}
    `.trim();

    try {
      await notesService.create({
        lead_id: lead.id,
        title: `SEO Audit - Score: ${auditResults.score}/100`,
        content: noteContent,
        note_type: 'general',
      });
      loadNotes();
      setAuditResults(null);
    } catch (error) {
      console.error('Failed to save audit:', error);
    }
  };

  const noteTypeIcons: Record<string, any> = {
    general: FileText,
    call: Phone,
    email: Mail,
    meeting: Building2,
    followup: Clock,
  };

  return (
    <div className="w-full lg:w-[450px] border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{lead.contact_name}</h2>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        {lead.company_name && <p className="text-gray-500">{lead.company_name}</p>}
        <div className="flex items-center space-x-2 mt-2">
          <span className={`badge ${statusOptions.find((s) => s.value === lead.status)?.color}`}>
            {lead.status}
          </span>
          {lead.source && <span className="badge bg-gray-100 text-gray-600">{lead.source}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-gray-200 flex space-x-2">
        <button onClick={onEdit} className="btn btn-secondary flex-1 text-sm">
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </button>
        {lead.status !== 'won' && lead.status !== 'lost' && (
          <button onClick={onConvert} className="btn btn-primary flex-1 text-sm">
            <UserPlus className="w-4 h-4 mr-1" />
            Convert
          </button>
        )}
        <button onClick={onDelete} className="btn btn-danger text-sm px-3">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Contact Info */}
      <div className="p-4 border-b border-gray-200 space-y-2">
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Mail className="w-4 h-4 mr-2 text-gray-400" />
            {lead.email}
          </a>
        )}
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Phone className="w-4 h-4 mr-2 text-gray-400" />
            {lead.phone}
          </a>
        )}
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noopener" className="flex items-center text-sm text-gray-600 hover:text-orange-500">
            <Globe className="w-4 h-4 mr-2 text-gray-400" />
            {lead.website}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
          {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : 'No value'} • {lead.probability}%
        </div>
      </div>

      {/* Lead Audit Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">SEO Audit</h3>
          <button
            onClick={runLeadAudit}
            disabled={auditing || !lead.website}
            className="btn btn-secondary text-sm py-1"
          >
            {auditing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1 text-purple-500" />
                Run Audit
              </>
            )}
          </button>
        </div>

        {auditError && (
          <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-3">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {auditError}
          </div>
        )}

        {auditResults && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-3 text-sm">
            {/* Score Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div>
                <span className="text-gray-600">Score</span>
                <div className="text-2xl font-bold">
                  <span className={
                    auditResults.score >= 80 ? 'text-green-600' : 
                    auditResults.score >= 60 ? 'text-yellow-600' : 
                    auditResults.score >= 40 ? 'text-orange-600' : 'text-red-600'
                  }>
                    {auditResults.score}
                  </span>
                  <span className="text-gray-400 text-lg">/100</span>
                </div>
              </div>
              <div className={`text-3xl font-bold ${
                auditResults.grade === 'A' ? 'text-green-600' : 
                auditResults.grade === 'B' ? 'text-yellow-600' : 
                auditResults.grade === 'C' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {auditResults.grade}
              </div>
            </div>

            {/* Response Time */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Response Time (TTFB)</span>
              <span className={auditResults.responseTime < 500 ? 'text-green-600' : auditResults.responseTime < 1000 ? 'text-yellow-600' : 'text-red-600'}>
                {auditResults.responseTime}ms
              </span>
            </div>

            {/* Key Checks */}
            <div className="space-y-1.5 pt-2 border-t border-gray-200">
              <p className="font-medium text-gray-700">Key Checks:</p>
              {auditResults.checks.slice(0, 6).map((check: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-600">{check.name}</span>
                  <span className={check.passed ? 'text-green-600' : 'text-red-600'}>
                    {check.passed ? <CheckCircle className="w-4 h-4 inline" /> : <AlertCircle className="w-4 h-4 inline" />}
                  </span>
                </div>
              ))}
              {auditResults.checks.length > 6 && (
                <p className="text-gray-500 text-xs">+{auditResults.checks.length - 6} more checks</p>
              )}
            </div>

            {/* Top Recommendations */}
            {auditResults.recommendations.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="font-medium text-gray-700 mb-1">Top Issues:</p>
                <ul className="text-gray-600 space-y-1.5">
                  {auditResults.recommendations
                    .filter((r: any) => r.priority === 'critical' || r.priority === 'high')
                    .slice(0, 3)
                    .map((r: any, i: number) => (
                      <li key={i} className="flex items-start">
                        <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0 ${
                          r.priority === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                        }`}></span>
                        <span>{r.message}</span>
                      </li>
                    ))}
                </ul>
                {auditResults.recommendations.length > 3 && (
                  <p className="text-gray-500 text-xs mt-1">
                    +{auditResults.recommendations.length - 3} more recommendations
                  </p>
                )}
              </div>
            )}

            <button onClick={saveAuditAsNote} className="btn btn-primary w-full text-sm mt-2">
              Save Full Report as Note
            </button>
          </div>
        )}

        {!lead.website && (
          <p className="text-sm text-gray-500">Add a website to run an audit</p>
        )}
      </div>

      {/* Notes Section */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Notes & Activity</h3>
          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="text-orange-500 hover:text-orange-600 text-sm font-medium"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Note
          </button>
        </div>

        {showNoteForm && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <select
              value={newNote.note_type}
              onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value as NoteType })}
              className="input mb-2 text-sm"
            >
              <option value="general">General Note</option>
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="followup">Follow-up</option>
            </select>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Add your notes..."
              className="input text-sm"
              rows={3}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button onClick={() => setShowNoteForm(false)} className="btn btn-secondary text-sm py-1">
                Cancel
              </button>
              <button onClick={handleAddNote} className="btn btn-primary text-sm py-1">
                Save Note
              </button>
            </div>
          </div>
        )}

        {loadingNotes ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const Icon = noteTypeIcons[note.note_type] || FileText;
              return (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 capitalize">{note.note_type}</span>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(note.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {note.title && <p className="font-medium text-gray-900 text-sm">{note.title}</p>}
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Lead Modal
interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSave: () => void;
}

function LeadModal({ lead, onClose, onSave }: LeadModalProps) {
  const [formData, setFormData] = useState({
    contact_name: lead?.contact_name || '',
    company_name: lead?.company_name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    website: lead?.website || '',
    source: lead?.source || '',
    status: lead?.status || 'new',
    estimated_value: lead?.estimated_value?.toString() || '',
    probability: lead?.probability?.toString() || '50',
    notes: lead?.notes || '',
    next_follow_up: lead?.next_follow_up || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
        probability: parseInt(formData.probability),
      };
      if (lead) {
        await leadsService.update(lead.id, data);
      } else {
        await leadsService.create(data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save lead:', error);
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
              {lead ? 'Edit Lead' : 'New Lead'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Company Name</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
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
              <div className="col-span-2">
                <label className="label">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="input"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="label">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="input"
                >
                  <option value="">Select source</option>
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                  className="input"
                >
                  {statusOptions.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estimated Value</label>
                <input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  className="input"
                  placeholder="$"
                />
              </div>
              <div>
                <label className="label">Probability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Next Follow-up</label>
                <input
                  type="date"
                  value={formData.next_follow_up}
                  onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Lead Finder Modal
interface LeadFinderModalProps {
  onClose: () => void;
  onAddLead: (data: any) => void;
}

function LeadFinderModal({ onClose, onAddLead }: LeadFinderModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [bulkSearching, setBulkSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [searchInfo, setSearchInfo] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!industry && !location && !searchQuery) {
      setError('Please enter at least one search criteria');
      return;
    }

    setSearching(true);
    setError(null);
    setSearchInfo(null);
    setResults([]);
    setTotalFound(0);

    try {
      const response = await placesService.search({
        query: searchQuery,
        location: location,
        type: industry,
      });
      setResults(response.results);
      setTotalFound(response.totalFound || response.results.length);
      if (response.results.length === 0) {
        setError('No businesses found. Try different search criteria.');
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Search failed. Check your API key configuration.');
    } finally {
      setSearching(false);
    }
  };

  const handleBulkSearch = async () => {
    if (!industry || !location) {
      setError('Industry and Location are required for bulk search');
      return;
    }

    setBulkSearching(true);
    setError(null);
    setSearchInfo('Starting comprehensive search... This may take 1-2 minutes.');
    setResults([]);
    setTotalFound(0);

    try {
      const response = await placesService.bulkSearch({
        location: location,
        type: industry,
        radiusMiles: 50,
      });
      setResults(response.results);
      setTotalFound(response.totalFound || response.results.length);
      setSearchInfo(`Found ${response.total} businesses with ${response.searchesPerformed} searches`);
      if (response.results.length === 0) {
        setError('No businesses found. Try a different location or category.');
      }
    } catch (err: any) {
      console.error('Bulk search failed:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Bulk search failed.');
    } finally {
      setBulkSearching(false);
    }
  };

  const addAsLead = async (place: PlaceResult) => {
    try {
      // Build opportunity notes
      const opportunityNotes = [];
      if (!place.has_website) {
        opportunityNotes.push('❌ No website - needs web presence');
      } else if (place.website) {
        opportunityNotes.push(`✓ Has website: ${place.website}`);
      }
      if (place.rating && place.rating < 4) {
        opportunityNotes.push(`⚠️ Low rating (${place.rating}/5) - may need reputation help`);
      }
      if (place.reviews_count < 20) {
        opportunityNotes.push(`📊 Few reviews (${place.reviews_count}) - needs more visibility`);
      }

      await leadsService.create({
        contact_name: place.name, // Company name as contact for now
        company_name: place.name,
        phone: place.phone || undefined,
        website: place.website || undefined,
        source: 'Google Places',
        notes: `📍 ${place.address}\n\n**Opportunity Analysis:**\n${opportunityNotes.join('\n')}\n\n**Business Type:** ${place.types.slice(0, 3).join(', ')}`,
        status: 'new',
        probability: Math.min(80, Math.round(place.likelihood_score * 0.8)),
        estimated_value: place.estimated_value,
      });

      setAddedIds(new Set([...addedIds, place.place_id]));
    } catch (error) {
      console.error('Failed to add lead:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-purple-500" />
                Lead Finder
              </h2>
              <p className="text-gray-500 text-sm">Find businesses within 50 miles, ranked by opportunity</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Form */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="label">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="input"
              >
                <option value="">All Industries</option>
                <option value="legal">Legal ($$$$)</option>
                <option value="healthcare">Healthcare ($$$)</option>
                <option value="realestate">Real Estate ($$$)</option>
                <option value="professional">Professional Services ($$$)</option>
                <option value="automotive">Automotive ($$)</option>
                <option value="homeservices">Home Services ($$)</option>
                <option value="salon">Salons & Spas ($$)</option>
                <option value="fitness">Fitness & Gyms ($$)</option>
                <option value="restaurant">Restaurants ($)</option>
                <option value="retail">Retail ($)</option>
              </select>
            </div>
            <div>
              <label className="label">Location (50mi radius)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="City, State"
              />
            </div>
            <div>
              <label className="label">Keywords (optional)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                placeholder="e.g., family, boutique"
              />
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={handleSearch}
              disabled={searching || bulkSearching}
              className="btn btn-secondary flex-1"
            >
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500 mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Quick Search
                </>
              )}
            </button>
            <button
              onClick={handleBulkSearch}
              disabled={searching || bulkSearching || !industry || !location}
              className="btn btn-primary flex-1"
              title={!industry || !location ? 'Select industry and location' : 'Find all businesses in category'}
            >
              {bulkSearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Finding all...
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 mr-2" />
                  Get ALL {industry ? industry.charAt(0).toUpperCase() + industry.slice(1) : 'Businesses'}
                </>
              )}
            </button>
          </div>

          {bulkSearching && (
            <div className="bg-blue-50 text-blue-700 rounded-lg p-3 mb-4 text-sm">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                {searchInfo || 'Searching multiple keywords across the area... This takes 1-2 minutes.'}
              </div>
            </div>
          )}

          {/* Info Message */}
          {searchInfo && !bulkSearching && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 mb-4 text-sm">
              <CheckCircle className="w-4 h-4 inline mr-2" />
              {searchInfo}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Showing {results.length} of {totalFound} businesses
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (ranked by value + likelihood)
                  </span>
                </h3>
                <span className="text-xs text-gray-500">
                  50mi radius • {location}
                </span>
              </div>
              {results.map((place, idx) => (
                <div 
                  key={place.place_id} 
                  className={`border rounded-lg p-4 transition-colors ${
                    addedIds.has(place.place_id) 
                      ? 'border-green-300 bg-green-50' 
                      : idx === 0 ? 'border-orange-400 bg-orange-50' 
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header with rank */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          idx === 0 ? 'bg-orange-500 text-white' :
                          idx < 3 ? 'bg-orange-200 text-orange-800' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          #{idx + 1}
                        </span>
                        <h4 className="font-medium text-gray-900 truncate">{place.name}</h4>
                        {place.rating && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            place.rating >= 4 ? 'bg-green-100 text-green-700' :
                            place.rating >= 3 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            ★ {place.rating}
                          </span>
                        )}
                        {!place.has_website && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                            No Website
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 truncate">{place.address}</p>
                      
                      {/* Contact info */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                        {place.phone && (
                          <a href={`tel:${place.phone}`} className="text-gray-600 hover:text-orange-500 flex items-center">
                            <Phone className="w-3.5 h-3.5 mr-1" />
                            {place.phone}
                          </a>
                        )}
                        {place.website && (
                          <a href={place.website} target="_blank" rel="noopener" className="text-gray-600 hover:text-orange-500 flex items-center">
                            <Globe className="w-3.5 h-3.5 mr-1" />
                            Website
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        )}
                        <span className="text-gray-400 text-xs">
                          {place.reviews_count} reviews
                        </span>
                      </div>

                      {/* Scoring reasons */}
                      {place.scoring_reasons && place.scoring_reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {place.scoring_reasons.slice(0, 3).map((reason, i) => (
                            <span key={i} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Right side - scores and action */}
                    <div className="flex-shrink-0 text-right">
                      {/* Value estimate */}
                      <div className="text-lg font-bold text-green-600">
                        ${place.estimated_value.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">est. project value</div>
                      
                      {/* Score bars */}
                      <div className="flex gap-1 mb-2 justify-end">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Opp</div>
                          <div className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            place.opportunity_score >= 60 ? 'bg-green-100 text-green-700' :
                            place.opportunity_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {place.opportunity_score}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Likely</div>
                          <div className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            place.likelihood_score >= 50 ? 'bg-green-100 text-green-700' :
                            place.likelihood_score >= 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {place.likelihood_score}
                          </div>
                        </div>
                      </div>
                      
                      {addedIds.has(place.place_id) ? (
                        <span className="text-green-600 text-sm flex items-center justify-end">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => addAsLead(place)}
                          className="btn btn-primary text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Lead
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !searching && (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Enter search criteria to find potential leads</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
