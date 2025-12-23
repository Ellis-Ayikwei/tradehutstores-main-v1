import React from 'react';
import { X } from 'lucide-react';

interface BulkActionsProps {
  selectedNotifications: string[];
  setSelectedNotifications: (notifications: string[]) => void;
  bulkAction: string;
  setBulkAction: (action: string) => void;
  handleBulkAction: () => void;
  loading: boolean;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedNotifications,
  setSelectedNotifications,
  bulkAction,
  setBulkAction,
  handleBulkAction,
  loading
}) => {
  if (selectedNotifications.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selectedNotifications.length} notification(s) selected
          </span>
          
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-1 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-blue-800 dark:text-white text-sm"
          >
            <option value="">Select action</option>
            <option value="mark_read">Mark as Read</option>
            <option value="delete">Delete</option>
          </select>
          
          <button
            onClick={handleBulkAction}
            disabled={!bulkAction || loading}
            className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        
        <button
          onClick={() => setSelectedNotifications([])}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BulkActions;
