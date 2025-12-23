import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../services/axiosInstance';
import { Filter, RefreshCw, Eye, AlertTriangle, Plus, X } from 'lucide-react';
import DraggableDataTable, { type ColumnDefinition } from '../../../components/ui/DraggableDataTable';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: 'account' | 'billing' | 'technical' | 'dispute' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  contact_name?: string | null;
  contact_email?: string | null;
  created_at: string;
}

const TicketsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [escalatedOnly, setEscalatedOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{
    subject: string;
    description: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    contact_name?: string;
    contact_email?: string;
  }>({
    subject: '',
    description: '',
    category: 'other',
    priority: 'normal',
    contact_name: '',
    contact_email: '',
  });

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (escalatedOnly) params.append('is_escalated', 'true');
    return params.toString();
  };

  const { data, mutate, isLoading } = useSWR(
    `/support/tickets/?${buildQuery()}`,
    async (url: string) => {
      const res = await axiosInstance.get(url);
      return (res.data?.results || res.data || []) as SupportTicket[];
    },
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  const tickets = useMemo(() => data || [], [data]);

  const badge = (p: SupportTicket['priority']) => {
    const cls = p === 'urgent' ? 'bg-red-100 text-red-700'
      : p === 'high' ? 'bg-orange-100 text-orange-700'
      : p === 'normal' ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{p}</span>;
  };

  const columns: ColumnDefinition[] = useMemo(() => [
    {
      accessor: 'subject',
      title: 'Subject',
      render: (t: SupportTicket) => (
        <div className="max-w-[360px]">
          <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{t.subject}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{t.description}</div>
        </div>
      )
    },
    { accessor: 'category', title: 'Category', width: 140, render: (t: SupportTicket) => <span className="text-xs capitalize">{t.category}</span> },
    { accessor: 'priority', title: 'Priority', width: 120, render: (t: SupportTicket) => badge(t.priority) },
    { accessor: 'status', title: 'Status', width: 140, render: (t: SupportTicket) => (
      <div className="flex items-center gap-2">
        <span className="text-xs capitalize">{t.status.replace('_',' ')}</span>
        {t.priority === 'urgent' || t.status === 'open' ? null : null}
        {t && (t as any).is_escalated ? <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 text-red-700">Escalated</span> : null}
      </div>
    ) },
    { accessor: 'contact', title: 'Contact', width: 220, render: (t: SupportTicket) => (
      <div className="text-xs text-gray-700 dark:text-gray-300">
        {t.contact_name || 'Anonymous'} {t.contact_email ? <span className="text-gray-500">({t.contact_email})</span> : null}
      </div>
    )},
    { accessor: 'created_at', title: 'Created', width: 180, render: (t: SupportTicket) => new Date(t.created_at).toLocaleString() },
    { accessor: 'actions', title: '', width: 120, textAlign: 'right', render: (t: SupportTicket) => (
      <div className="flex items-center gap-2 justify-end">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/support/tickets/${t.id}`); }} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center">
          <Eye className="w-3 h-3 mr-1" /> View
        </button>
      </div>
    )}
  ], [navigate]);

  const canSubmitCreate = useMemo(() => {
    return (createForm.subject.trim().length > 0) && (createForm.description.trim().length > 0);
  }, [createForm.subject, createForm.description]);

  const submitCreate = async () => {
    if (!canSubmitCreate) return;
    try {
      setCreating(true);
      const payload: any = {
        subject: createForm.subject.trim().slice(0, 200),
        description: createForm.description.trim().slice(0, 5000),
        category: createForm.category,
        priority: createForm.priority,
      };
      if (createForm.contact_name?.trim()) payload.contact_name = createForm.contact_name.trim().slice(0, 200);
      if (createForm.contact_email?.trim()) payload.contact_email = createForm.contact_email.trim();
      await axiosInstance.post('/support/tickets/', payload);
      setShowCreate(false);
      setCreateForm({ subject: '', description: '', category: 'other', priority: 'normal', contact_name: '', contact_email: '' });
      mutate();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="panel">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center">
            <Plus className="w-4 h-4 mr-2" /> New Ticket
          </button>
          <button onClick={() => mutate()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject or description" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
          <div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="">All Categories</option>
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="dispute">Dispute</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Filter className="w-4 h-4 mr-2" /> {tickets.length} result(s)
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={escalatedOnly} onChange={(e) => setEscalatedOnly(e.target.checked)} className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
              <span>Escalated only</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">No tickets found</div>
        ) : (
          <DraggableDataTable
            title="Tickets"
            data={tickets}
            columns={columns}
            loading={isLoading}
            allowSelection={false}
            storeKey="support-tickets-table"
            headerContent={null}
          />
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Support Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                <input value={createForm.subject} onChange={(e) => setCreateForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Short summary" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Category</label>
                <select value={createForm.category} onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value as SupportTicket['category'] }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="account">Account</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="dispute">Dispute</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                <select value={createForm.priority} onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value as SupportTicket['priority'] }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Contact Name (optional)</label>
                <input value={createForm.contact_name} onChange={(e) => setCreateForm(f => ({ ...f, contact_name: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Contact Email (optional)</label>
                <input type="email" value={createForm.contact_email} onChange={(e) => setCreateForm(f => ({ ...f, contact_email: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea rows={5} value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Describe the issue" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
              <button onClick={submitCreate} disabled={!canSubmitCreate || creating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{creating ? 'Creating...' : 'Create Ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsManagement;


