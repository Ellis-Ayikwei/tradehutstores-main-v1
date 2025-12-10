import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import { Search, Filter, RefreshCw, MessageSquare, User, AlertTriangle, CheckCircle, XCircle, Eye, Plus, X } from 'lucide-react';
import DraggableDataTable, { type ColumnDefinition } from '../../../components/ui/DraggableDataTable';

interface Dispute {
  id: string;
  created_by: string;
  against_user?: string;
  title: string;
  description: string;
  related_object_type?: string;
  related_object_id?: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_escalated: boolean;
  resolution_notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface DisputeMessage {
  id: string;
  sender: string;
  sender_name?: string;
  message: string;
  attachments: any[];
  created_at: string;
}

const DisputeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [escalatedOnly, setEscalatedOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{
    title: string;
    description: string;
    against_user?: string;
    related_object_type?: string;
    related_object_id?: string;
    priority: Dispute['priority'];
  }>({
    title: '',
    description: '',
    against_user: '',
    related_object_type: '',
    related_object_id: '',
    priority: 'normal'
  });

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (search) params.append('search', search);
    if (escalatedOnly) params.append('is_escalated', 'true');
    return params.toString();
  };

  const { data: disputes, mutate, isLoading } = useSWR(
    `/disputes/?${buildQuery()}`,
    async (url: string) => {
      const res = await axiosInstance.get(url);
      return res.data?.results || res.data || [];
    },
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  const updateStatus = async (id: string, newStatus: Dispute['status']) => {
    try {
      setSaving(true);
      await axiosInstance.patch(`/disputes/${id}/`, { status: newStatus });
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const canSubmitCreate = useMemo(() => {
    return (createForm.title?.trim()?.length || 0) > 0 && (createForm.description?.trim()?.length || 0) > 0;
  }, [createForm.title, createForm.description]);

  const submitCreate = async () => {
    if (!canSubmitCreate) return;
    try {
      setCreating(true);
      const payload: any = {
        title: createForm.title?.trim(),
        description: createForm.description?.trim(),
        priority: createForm.priority,
      };
      if (createForm.against_user?.trim()) payload.against_user_identifier = createForm.against_user?.trim();
      if (createForm.related_object_type?.trim()) payload.related_object_type = createForm.related_object_type?.trim();
      if (createForm.related_object_id?.trim()) payload.related_object_id = createForm.related_object_id?.trim();
      await axiosInstance.post('/disputes/', payload);
      setShowCreate(false);
      setCreateForm({ title: '', description: '', against_user: '', related_object_type: '', related_object_id: '', priority: 'normal' });
      mutate();
    } finally {
      setCreating(false);
    }
  };

  const headerBadge = (d: Dispute) => {
    const cls = d.priority === 'urgent' ? 'bg-red-100 text-red-700'
      : d.priority === 'high' ? 'bg-orange-100 text-orange-700'
      : d.priority === 'normal' ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{d.priority}</span>;
  };

  const statusColor = (s: Dispute['status']) => (
    s === 'open' ? 'text-blue-600' : s === 'in_review' ? 'text-orange-600' : s === 'resolved' ? 'text-green-600' : 'text-red-600'
  );

  const filtered = useMemo(() => disputes || [], [disputes]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns: ColumnDefinition[] = useMemo(() => [
    {
      accessor: 'title',
      title: 'Title',
      render: (d: Dispute) => (
        <div className="max-w-[320px]">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{d.title}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{d.description}</div>
        </div>
      )
    },
    {
      accessor: 'status',
      title: 'Status',
      width: 140,
      render: (d: Dispute) => (
        <span className={`text-xs font-medium ${statusColor(d.status)}`}>{d.status.replace('_', ' ')}</span>
      )
    },
    {
      accessor: 'priority',
      title: 'Priority',
      width: 120,
      render: (d: Dispute) => headerBadge(d)
    },
    {
      accessor: 'related',
      title: 'Related',
      width: 220,
      render: (d: Dispute) => (
        d.related_object_type && d.related_object_id ? (
          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
            <MessageSquare className="w-3 h-3" /> {d.related_object_type} #{d.related_object_id}
          </div>
        ) : <span className="text-xs text-gray-400">—</span>
      )
    },
    {
      accessor: 'created_by',
      title: 'Created By',
      width: 200,
      render: (d: Dispute) => (
        <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"><User className="w-3 h-3" /> {d.created_by}</div>
      )
    },
    {
      accessor: 'created_at',
      title: 'Created',
      width: 180,
      render: (d: Dispute) => (
        <div className="text-xs text-gray-600 dark:text-gray-300">{formatDate(d.created_at)}</div>
      )
    },
    {
      accessor: 'actions',
      title: '',
      width: 200,
      textAlign: 'right',
      render: (d: Dispute) => (
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/disputes/${d.id}`); }}
            className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center"
          >
            <Eye className="w-3 h-3 mr-1" /> View
          </button>
          {/* <button onClick={(e) => { e.stopPropagation(); updateStatus(d.id, 'resolved'); }} className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" /> Resolve
          </button>
          <button onClick={(e) => { e.stopPropagation(); updateStatus(d.id, 'rejected'); }} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 flex items-center">
            <XCircle className="w-3 h-3 mr-1" /> Reject
          </button> */}
        </div>
      )
    }
  ], []);

  return (
    <div className="panel">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispute Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage user disputes and message threads</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(v => !v)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center">
            {showCreate ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />} {showCreate ? 'Close' : 'New Dispute'}
          </button>
          <button onClick={() => mutate()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or description" className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Filter className="w-4 h-4 mr-2" /> {filtered.length} result(s)
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={escalatedOnly}
                onChange={(e) => setEscalatedOnly(e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span>Escalated only</span>
            </label>
          </div>
        </div>

        {showCreate && (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Dispute</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Title</label>
                <input value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Short summary" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                <select value={createForm.priority} onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value as Dispute['priority'] }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" rows={4} placeholder="Describe the dispute" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Against User (ID or email)</label>
                <input value={createForm.against_user} onChange={(e) => setCreateForm(f => ({ ...f, against_user: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Related Type</label>
                <input value={createForm.related_object_type} onChange={(e) => setCreateForm(f => ({ ...f, related_object_type: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="e.g. job, payment" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Related ID</label>
                <input value={createForm.related_object_id} onChange={(e) => setCreateForm(f => ({ ...f, related_object_id: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Optional" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={submitCreate} disabled={!canSubmitCreate || creating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="p-6 text-gray-500 dark:text-gray-400">Loading disputes...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">No disputes found</div>
          ) : (
            <DraggableDataTable
              title="Disputes"
              data={filtered}
              columns={columns}
              loading={isLoading}
              allowSelection={false}
              storeKey="disputes-table"
              headerContent={null}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DisputeManagement;


