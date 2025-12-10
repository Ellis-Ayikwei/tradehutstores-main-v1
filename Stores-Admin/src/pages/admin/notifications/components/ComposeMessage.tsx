import React from 'react';
import { Send, AlertCircle } from 'lucide-react';

interface ComposeMessageProps {
  composeOpen: boolean;
  setComposeOpen: (fn: (prev: boolean) => boolean) => void;
  compose: any;
  setCompose: (fn: (prev: any) => any) => void;
  sendNotification: () => void;
  usersData: any[];
  groupsData: any[];
}

const ComposeMessage: React.FC<ComposeMessageProps> = ({
  composeOpen,
  setComposeOpen,
  compose,
  setCompose,
  sendNotification,
  usersData,
  groupsData
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compose Message</h2>
        </div>
        <button
          onClick={() => setComposeOpen(v => !v)}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
        >
          {composeOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      {composeOpen && (
        <div className="space-y-4">
          {/* Target Selection */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Target Audience</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'user', label: 'Specific User', icon: '👤' },
                    { value: 'group', label: 'User Group', icon: '👥' },
                    { value: 'role', label: 'User Role', icon: '🎭' },
                    { value: 'all', label: 'All Users', icon: '🌍' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <input
                        type="radio"
                        name="target_type"
                        value={option.value}
                        checked={compose.target_type === option.value}
                        onChange={(e) => setCompose({ ...compose, target_type: e.target.value })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-lg">{option.icon}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target-specific inputs */}
              {compose.target_type === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
                  <select
                    value={compose.target_user}
                    onChange={(e) => setCompose({ ...compose, target_user: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a user</option>
                    {(usersData || []).map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.email} – {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {compose.target_type === 'group' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Group</label>
                  <select
                    value={compose.target_group}
                    onChange={(e) => setCompose({ ...compose, target_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a group</option>
                    {(groupsData || []).map((g: any) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.user_count || 0} users)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {compose.target_type === 'role' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Role</label>
                  <select
                    value={compose.target_role}
                    onChange={(e) => setCompose({ ...compose, target_role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a role</option>
                    {['customer', 'provider', 'admin', 'staff'].map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}s
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {compose.target_type === 'all' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      This notification will be sent to ALL users in the system
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={compose.notification_type}
                onChange={(e) => setCompose({ ...compose, notification_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {['booking','payment','alert','reminder','system'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={compose.priority}
                onChange={(e) => setCompose({ ...compose, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channels</label>
            <div className="flex flex-wrap gap-3">
              {['in_app','email','sms','push'].map(ch => (
                <label key={ch} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={compose.delivery_channels.includes(ch)}
                    onChange={() => setCompose((c: any) => ({
                      ...c,
                      delivery_channels: c.delivery_channels.includes(ch)
                        ? c.delivery_channels.filter((x: string) => x !== ch)
                        : [...c.delivery_channels, ch]
                    }))}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              value={compose.title}
              onChange={(e) => setCompose({ ...compose, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={compose.message}
              onChange={(e) => setCompose({ ...compose, message: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action URL (optional)</label>
              <input
                value={compose.action_url}
                onChange={(e) => setCompose({ ...compose, action_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action Text (optional)</label>
              <input
                value={compose.action_text}
                onChange={(e) => setCompose({ ...compose, action_text: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={compose.expires_at}
                onChange={(e) => setCompose({ ...compose, expires_at: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Data (JSON, optional)</label>
            <textarea
              value={JSON.stringify(compose.data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setCompose({ ...compose, data: parsed });
                } catch {
                  // Invalid JSON, keep the text for user to fix
                }
              }}
              rows={3}
              placeholder='{"key": "value"}'
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={sendNotification}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComposeMessage;
