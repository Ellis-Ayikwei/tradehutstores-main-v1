import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import { ArrowLeft, Save, X, MessageSquare, Send, User, Clock, AlertTriangle } from 'lucide-react';

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
  updated_at: string;
  is_escalated?: boolean;
}

interface SupportMessage {
  id: string;
  sender: string;
  message: string;
  attachments: any[];
  created_at: string;
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SupportTicket>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: ticket, mutate: mutateTicket } = useSWR(
    id ? `/support/tickets/${id}/` : null,
    async (url: string) => (await axiosInstance.get(url)).data as SupportTicket
  );

  const { data: messages, mutate: mutateMessages } = useSWR(
    id ? `/support/tickets/${id}/messages/` : null,
    async (url: string) => (await axiosInstance.get(url)).data as SupportMessage[],
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    if (ticket) {
      setEditForm({
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
      });
    }
  }, [ticket]);

  const handleSave = async () => {
    if (!ticket) return;
    try {
      setSaving(true);
      await axiosInstance.patch(`/support/tickets/${ticket.id}/`, {
        status: editForm.status,
        priority: editForm.priority,
        metadata: {},
      });
      await mutateTicket();
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!ticket || !message.trim()) return;
    try {
      setSaving(true);
      await axiosInstance.post(`/support/tickets/${ticket.id}/add_message/`, { message });
      setMessage('');
      await mutateMessages();
    } finally {
      setSaving(false);
    }
  };

  if (!ticket) {
    return (
      <div className="panel">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading ticket...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/support/tickets')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Ticket</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage ticket and communication</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center">
                  <X className="w-4 h-4 mr-2" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center">
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center">
                  Edit
                </button>
                <button onClick={async () => { setSaving(true); await axiosInstance.patch(`/support/tickets/${ticket.id}/`, { is_escalated: !ticket.is_escalated }); await mutateTicket(); setSaving(false); }} className={`px-4 py-2 rounded-lg transition-colors flex items-center ${ticket.is_escalated ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
                  <AlertTriangle className="w-4 h-4 mr-2" /> {ticket.is_escalated ? 'De-escalate' : 'Escalate'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket Information</h2>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 capitalize">{ticket.category}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-600 border capitalize">{ticket.status.replace('_', ' ')}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <p className="text-gray-900 dark:text-white">{ticket.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
              </div>
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SupportTicket['status'] })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select value={editForm.priority || ''} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as SupportTicket['priority'] })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" /> Messages ({messages?.length || 0})
              </h3>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{msg.sender}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">No messages yet</div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." rows={3} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none" />
                <button onClick={handleSendMessage} disabled={saving || !message.trim()} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center">
                  <Send className="w-4 h-4 mr-2" /> {saving ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                <span className="text-gray-900 dark:text-white">{ticket.contact_name || 'Anonymous'} {ticket.contact_email ? `(${ticket.contact_email})` : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="text-gray-900 dark:text-white">{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;


