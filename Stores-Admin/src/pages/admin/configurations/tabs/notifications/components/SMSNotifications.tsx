import React from 'react';
import { MessageSquare } from 'lucide-react';

const SMSNotifications: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure SMS notification providers and settings</p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">SMS notification configuration coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default SMSNotifications; 