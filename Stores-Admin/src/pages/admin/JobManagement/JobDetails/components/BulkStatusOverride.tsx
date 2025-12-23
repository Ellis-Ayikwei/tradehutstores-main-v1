import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Truck, 
  User, 
  X, 
  Save,
  Loader,
  AlertCircle,
  Users,
  FileText
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';
import { jobStatusService } from '../../../../../services/jobStatusService';
import { showNotification } from '../../../../../utilities/showNotifcation';

interface BulkStatusOverrideProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedJobs: Array<{
    id: string;
    tracking_number: string;
    status: string;
    request: {
      service_type: string;
      contact_name: string;
    };
  }>;
}

const JOB_STATUSES = [
  { value: 'draft', label: 'Draft', icon: Clock, color: 'gray' },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'amber' },
  { value: 'bidding', label: 'Bidding in Progress', icon: User, color: 'purple' },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'blue' },
  { value: 'assigned', label: 'Assigned', icon: User, color: 'cyan' },
  { value: 'in_transit', label: 'In Transit', icon: Truck, color: 'orange' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'green' },
  { value: 'cancelled', label: 'Cancelled', icon: AlertTriangle, color: 'red' }
];

const BulkStatusOverride: React.FC<BulkStatusOverrideProps> = ({ 
  open, 
  onClose, 
  onConfirm, 
  selectedJobs 
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setError(null);
  };

  const handleBulkOverride = async () => {
    if (!selectedStatus) {
      setError('Please select a status');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the status change');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const jobIds = selectedJobs.map(job => job.id);
      
      const response = await jobStatusService.updateBulkJobStatus({
        job_ids: jobIds,
        status: selectedStatus,
        reason: reason.trim(),
        override: true
      });

        console.log('Bulk status update successful');
        onConfirm();
        onClose();

        showNotification({ message: 'Bulk status update successful', type: 'Success', showHide: true });
  
    } catch (err: any) {
      console.error('Error updating job statuses:', err);
      setError(err.response?.data?.message || 'Failed to update job statuses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusConfig = JOB_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'gray';
  };

  const getStatusIcon = (status: string) => {
    const statusConfig = JOB_STATUSES.find(s => s.value === status);
    return statusConfig?.icon || Clock;
  };

  const canOverride = selectedStatus && reason.trim().length > 0;

  // Group jobs by current status
  const jobsByStatus = selectedJobs.reduce((acc, job) => {
    if (!acc[job.status]) {
      acc[job.status] = [];
    }
    acc[job.status].push(job);
    return acc;
  }, {} as { [key: string]: typeof selectedJobs });

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10 transition-all">
                <div className="relative">
                  {/* Header */}
                  <div className="px-6 pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white grid place-items-center shadow-md">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Bulk Status Override
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Change status for {selectedJobs.length} selected jobs
                          </Dialog.Description>
                        </div>
                      </div>
                      <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    {/* Selected Jobs Summary */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Selected Jobs ({selectedJobs.length})
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(jobsByStatus).map(([status, jobs]) => {
                          const StatusIcon = getStatusIcon(status);
                          const statusColor = getStatusColor(status);
                          
                          return (
                            <div key={status} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-4 h-4 text-${statusColor}-600 dark:text-${statusColor}-400`} />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Selection */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Select New Status</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {JOB_STATUSES.map((status) => {
                          const Icon = status.icon;
                          const isSelected = selectedStatus === status.value;
                          
                          return (
                            <button
                              key={status.value}
                              onClick={() => handleStatusChange(status.value)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? `border-${status.color}-500 bg-${status.color}-50 dark:bg-${status.color}-900/20`
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 ${
                                  isSelected 
                                    ? `text-${status.color}-600 dark:text-${status.color}-400`
                                    : 'text-gray-500 dark:text-gray-400'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  isSelected 
                                    ? `text-${status.color}-800 dark:text-${status.color}-200`
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {status.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reason Input */}
                    <div className="mb-6">
                      <label htmlFor="bulk-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Status Change *
                      </label>
                      <textarea
                        id="bulk-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a detailed reason for changing the status of all selected jobs..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        This reason will be logged and visible to customers and providers for all selected jobs.
                      </p>
                    </div>

                    {/* Warning */}
                    {selectedStatus && (
                      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                        <div className="flex flex-row justify-center items-start gap-3 ">
                          <AlertTriangle className="w-10 h-10 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                              Bulk Status Override Warning
                            </h5>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              You are about to change the status of <strong>{selectedJobs.length} jobs</strong> to <strong>{selectedStatus.replace('_', ' ')}</strong>. 
                              This action will be logged and may affect billing, notifications, and customer communications for all selected jobs.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 pb-6 flex items-center justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkOverride}
                      disabled={!canOverride || loading}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 flex items-center gap-2 transition ${
                        !canOverride || loading ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Updating {selectedJobs.length} Jobs...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Override {selectedJobs.length} Jobs
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BulkStatusOverride;
