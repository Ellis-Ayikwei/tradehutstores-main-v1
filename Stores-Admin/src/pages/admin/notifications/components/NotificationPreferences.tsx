import React from 'react';
import { Settings, Mail, MessageSquare, Bell, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface NotificationPreferencesProps {
  prefsForm: any;
  setPrefsForm: (fn: (prev: any) => any) => void;
  savePrefs: () => void;
  prefsLoading: boolean;
  activeChannel: string;
  setActiveChannel: (channel: string) => void;
  expandedChannels: Record<string, boolean>;
  isSaving: boolean;
  setExpandedChannels: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  prefsForm,
  setPrefsForm,
  savePrefs,
  prefsLoading,
  activeChannel,
  setActiveChannel,
  expandedChannels,
  setExpandedChannels,
  isSaving,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
        </div>
        <button
          onClick={savePrefs}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {prefsLoading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading preferences...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              { key: 'email_notifications', label: 'Email Notifications', desc: 'Send notifications via email', icon: Mail },
              { key: 'push_notifications', label: 'Push Notifications', desc: 'Send push notifications', icon: Bell },
              { key: 'sms_notifications', label: 'SMS Notifications', desc: 'Send notifications via text message', icon: MessageSquare },
              { key: 'in_app_notifications', label: 'In-App Notifications', desc: 'Show notifications in the app', icon: Eye }
            ].map(ch => (
              <div key={ch.key} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <ch.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{ch.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{ch.desc}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefsForm((p: any) => ({ ...p, [ch.key]: !p[ch.key] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${prefsForm[ch.key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <span className={`${prefsForm[ch.key] ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
              </div>
            ))}
          </div>
          
          {/* Notification Types */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Types by Channel</h3>
            
            {/* Channel Tabs */}
            <div className="space-y-2">
              {[
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'sms', label: 'SMS', icon: MessageSquare },
                { key: 'push', label: 'Push', icon: Bell },
                { key: 'in_app', label: 'In-App', icon: Eye }
              ].map((channel) => (
                <div key={channel.key} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    onClick={() => {
                      setActiveChannel(channel.key);
                      setExpandedChannels(prev => ({ ...prev, [channel.key]: !prev[channel.key] }));
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${
                      activeChannel === channel.key
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <channel.icon className="w-5 h-5" />
                      <span className="font-medium">{channel.label}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({Object.values(prefsForm[`${channel.key}_types`] || {}).filter(Boolean).length} enabled)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        prefsForm[`${channel.key}_notifications`] ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      {expandedChannels[channel.key] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded content */}
                  {expandedChannels[channel.key] && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-medium text-gray-900 dark:text-white">
                            {channel.label} Notification Types
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const allEnabled = Object.keys(prefsForm[`${channel.key}_types`] || {}).reduce((acc, key) => {
                                  acc[key] = true;
                                  return acc;
                                }, {} as any);
                                setPrefsForm((p: any) => ({ ...p, [`${channel.key}_types`]: allEnabled }));
                              }}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-lg"
                            >
                              Enable All
                            </button>
                            <button
                              onClick={() => {
                                const allDisabled = Object.keys(prefsForm[`${channel.key}_types`] || {}).reduce((acc, key) => {
                                  acc[key] = false;
                                  return acc;
                                }, {} as any);
                                setPrefsForm((p: any) => ({ ...p, [`${channel.key}_types`]: allDisabled }));
                              }}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                            >
                              Disable All
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(prefsForm[`${channel.key}_types`] || {}).map(([type, enabled]) => (
                            <label key={type} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={enabled as boolean}
                                  onChange={() => setPrefsForm((p: any) => ({
                                    ...p,
                                    [`${channel.key}_types`]: { ...p[`${channel.key}_types`], [type]: !p[`${channel.key}_types`][type] }
                                  }))}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <span className="text-sm text-gray-800 dark:text-gray-200 capitalize">
                                  {type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPreferences;
