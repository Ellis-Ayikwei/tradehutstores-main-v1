import React from 'react';
import { Smartphone } from 'lucide-react';

const PushNotifications: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure push notifications for mobile apps</p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Push notification configuration coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default PushNotifications; 