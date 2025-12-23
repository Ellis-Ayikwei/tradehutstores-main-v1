import React, { useState } from 'react';
import { 
  MoreVertical, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Truck, 
  User, 
  X,
  RotateCcw,
  Play,
  Pause,
  Square
} from 'lucide-react';
import JobStatusOverride from './JobStatusOverride';

interface JobStatusQuickActionsProps {
  job: {
    id: string;
    status: string;
    tracking_number: string;
    request: {
      service_type: string;
      contact_name: string;
    };
  };
  onStatusChange: () => void;
}

const JobStatusQuickActions: React.FC<JobStatusQuickActionsProps> = ({ 
  job, 
  onStatusChange 
}) => {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'draft': 'gray',
      'pending': 'amber',
      'bidding': 'purple',
      'accepted': 'blue',
      'assigned': 'cyan',
      'in_transit': 'orange',
      'completed': 'green',
      'cancelled': 'red'
    };
    return statusColors[status] || 'gray';
  };

  const getStatusIcon = (status: string) => {
    const statusIcons: { [key: string]: any } = {
      'draft': Clock,
      'pending': Clock,
      'bidding': User,
      'accepted': CheckCircle,
      'assigned': User,
      'in_transit': Truck,
      'completed': CheckCircle,
      'cancelled': X
    };
    return statusIcons[status] || Clock;
  };

  const getQuickActions = () => {
    const actions = [];
    const currentStatus = job.status;

    // Define quick actions based on current status
    switch (currentStatus) {
      case 'draft':
        actions.push(
          { label: 'Make Pending', status: 'pending', icon: Clock, color: 'amber' },
          { label: 'Start Bidding', status: 'bidding', icon: User, color: 'purple' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'pending':
        actions.push(
          { label: 'Start Bidding', status: 'bidding', icon: User, color: 'purple' },
          { label: 'Assign Directly', status: 'assigned', icon: User, color: 'cyan' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'bidding':
        actions.push(
          { label: 'Accept Bid', status: 'accepted', icon: CheckCircle, color: 'blue' },
          { label: 'Assign Provider', status: 'assigned', icon: User, color: 'cyan' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'accepted':
        actions.push(
          { label: 'Assign Provider', status: 'assigned', icon: User, color: 'cyan' },
          { label: 'Start Job', status: 'in_transit', icon: Truck, color: 'orange' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'assigned':
        actions.push(
          { label: 'Start Job', status: 'in_transit', icon: Truck, color: 'orange' },
          { label: 'Complete Job', status: 'completed', icon: CheckCircle, color: 'green' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'in_transit':
        actions.push(
          { label: 'Complete Job', status: 'completed', icon: CheckCircle, color: 'green' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'completed':
        actions.push(
          { label: 'Reopen Job', status: 'in_transit', icon: RotateCcw, color: 'orange' },
          { label: 'Cancel Job', status: 'cancelled', icon: X, color: 'red' }
        );
        break;
      case 'cancelled':
        actions.push(
          { label: 'Reopen Job', status: 'pending', icon: RotateCcw, color: 'amber' },
          { label: 'Start Bidding', status: 'bidding', icon: User, color: 'purple' }
        );
        break;
      default:
        actions.push(
          { label: 'Custom Override', status: null, icon: AlertTriangle, color: 'orange' }
        );
    }

    return actions;
  };

  const quickActions = getQuickActions();
  const StatusIcon = getStatusIcon(job.status);
  const statusColor = getStatusColor(job.status);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showActions && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-2">
              {/* Current Status Display */}
              <div className="px-3 py-2 mb-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 text-${statusColor}-600 dark:text-${statusColor}-400`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Current: {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-1">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (action.status) {
                        // Handle quick status change
                        console.log(`Quick action: ${action.label} -> ${action.status}`);
                        setShowActions(false);
                        onStatusChange();
                      } else {
                        // Open override modal
                        setShowOverrideModal(true);
                        setShowActions(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <action.icon className={`w-4 h-4 text-${action.color}-600 dark:text-${action.color}-400`} />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom Override Option */}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                <button
                  onClick={() => {
                    setShowOverrideModal(true);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Custom Status Override</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop to close actions */}
        {showActions && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowActions(false)}
          />
        )}
      </div>

      {/* Status Override Modal */}
      <JobStatusOverride
        open={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        onConfirm={() => {
          console.log('Job status overridden');
          onStatusChange();
        }}
        job={job}
      />
    </>
  );
};

export default JobStatusQuickActions;
