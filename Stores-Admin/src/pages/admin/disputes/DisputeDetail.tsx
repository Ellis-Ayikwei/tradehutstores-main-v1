import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import { 
  ArrowLeft, 
  Edit3, 
  Save, 
  X, 
  MessageSquare, 
  Send, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Calendar,
  FileText,
  Tag
} from 'lucide-react';

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

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const DisputeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Dispute>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: dispute, mutate: mutateDispute } = useSWR(
    id ? `/disputes/${id}/` : null,
    async (url: string) => {
      const res = await axiosInstance.get(url);
      return res.data as Dispute;
    }
  );

  const { data: messages, mutate: mutateMessages } = useSWR(
    id ? `/disputes/${id}/messages/` : null,
    async (url: string) => {
      const res = await axiosInstance.get(url);
      return res.data as DisputeMessage[];
    },
    { refreshInterval: 5000 }
  );

  const { data: users } = useSWR(
    '/users/?limit=1000',
    async (url: string) => {
      const res = await axiosInstance.get(url);
      return res.data?.results || res.data || [];
    }
  );

  useEffect(() => {
    if (dispute) {
      setEditForm({
        title: dispute.title,
        description: dispute.description,
        status: dispute.status,
        priority: dispute.priority,
        is_escalated: dispute.is_escalated,
        resolution_notes: dispute.resolution_notes,
        against_user: dispute.against_user
      });
    }
  }, [dispute]);

  const handleSave = async () => {
    if (!dispute) return;
    
    try {
      setSaving(true);
      await axiosInstance.patch(`/disputes/${dispute.id}/`, editForm);
      await mutateDispute();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating dispute:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!dispute || !message.trim()) return;
    
    try {
      setSaving(true);
      await axiosInstance.post(`/disputes/${dispute.id}/messages/`, { message });
      setMessage('');
      await mutateMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: Dispute['status']) => {
    if (!dispute) return;
    
    try {
      setSaving(true);
      await axiosInstance.patch(`/disputes/${dispute.id}/`, { status: newStatus });
      await mutateDispute();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateEscalation = async (value: boolean) => {
    if (!dispute) return;
    try {
      setSaving(true);
      await axiosInstance.patch(`/disputes/${dispute.id}/`, { is_escalated: value });
      await mutateDispute();
    } catch (error) {
      console.error('Error updating escalation:', error);
    } finally {
      setSaving(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users?.find((u: User) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : userId;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'in_review': return 'text-orange-600 bg-orange-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!dispute) {
    return (
      <div className="panel">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading dispute...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/disputes')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Dispute' : 'Dispute Details'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage dispute and communication</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-2" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center"
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Edit
                </button>
                <button
                  onClick={() => updateEscalation(!dispute.is_escalated)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                    dispute.is_escalated
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" /> {dispute.is_escalated ? 'De-escalate' : 'Escalate'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dispute Information</h2>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
                  {dispute.priority.toUpperCase()}
                </span>
                {dispute.is_escalated && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" /> ESCALATED
                  </span>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dispute.status)}`}>
                {dispute.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{dispute.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{dispute.description}</p>
                )}
              </div>

              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Dispute['status'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={editForm.priority || ''}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Dispute['priority'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              )}

              {dispute.resolution_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.resolution_notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, resolution_notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{dispute.resolution_notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
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
                          <span className="font-medium">{msg.sender_name || getUserName(msg.sender)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No messages yet
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={saving || !message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {saving ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => updateStatus('resolved')}
                className="w-full px-3 py-2 text-sm rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Mark as Resolved
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                className="w-full px-3 py-2 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject Dispute
              </button>
              <button
                onClick={() => updateStatus('in_review')}
                className="w-full px-3 py-2 text-sm rounded bg-orange-100 text-orange-700 hover:bg-orange-200 flex items-center justify-center"
              >
                <Clock className="w-4 h-4 mr-2" /> Mark as In Review
              </button>
            </div>
          </div>

          {/* Dispute Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Created by:</span>
                <span className="text-gray-900 dark:text-white">{getUserName(dispute.created_by)}</span>
              </div>
              {dispute.against_user && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Against:</span>
                  <span className="text-gray-900 dark:text-white">{getUserName(dispute.against_user)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="text-gray-900 dark:text-white">{new Date(dispute.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                <span className="text-gray-900 dark:text-white">{new Date(dispute.updated_at).toLocaleDateString()}</span>
              </div>
              {dispute.related_object_type && dispute.related_object_id && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Related:</span>
                  <span className="text-gray-900 dark:text-white">
                    {dispute.related_object_type} #{dispute.related_object_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisputeDetail;
