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
  Info
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';

interface JobStatusOverrideProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  job: {
    id: string;
    status: string;
    tracking_number: string;
    request: {
      service_type: string;
      contact_name: string;
    };
  };
}

const JOB_STATUSES = [
  { value: 'draft', label: 'Draft', icon: Clock, color: 'gray', description: 'Job is being prepared' },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'amber', description: 'Awaiting provider assignment' },
  { value: 'bidding', label: 'Bidding in Progress', icon: User, color: 'purple', description: 'Providers are bidding' },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'blue', description: 'Job has been accepted' },
  { value: 'assigned', label: 'Assigned', icon: User, color: 'cyan', description: 'Provider has been assigned' },
  { value: 'in_transit', label: 'In Transit', icon: Truck, color: 'orange', description: 'Job is in progress' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'green', description: 'Job has been completed' },
  { value: 'cancelled', label: 'Cancelled', icon: AlertTriangle, color: 'red', description: 'Job has been cancelled' }
];

const JobStatusOverride: React.FC<JobStatusOverrideProps> = ({ 
  open, 
  onClose, 
  onConfirm, 
  job 
}) => {
  const [selectedStatus, setSelectedStatus] = useState(job.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setError(null);
  };

  const handleOverride = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the status change');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.patch(`/admin/jobs/${job.id}/status/`, {
        status: selectedStatus,
        reason: reason.trim(),
        override: true
      });

      if (response.status === 200) {
        console.log('Job status updated successfully');
        onConfirm();
        onClose();
      } else {
        setError('Failed to update job status. Please try again.');
      }
    } catch (err: any) {
      console.error('Error updating job status:', err);
      setError(err.response?.data?.message || 'Failed to update job status. Please try again.');
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

  const isStatusChange = selectedStatus !== job.status;
  const canOverride = isStatusChange && reason.trim().length > 0;

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10 transition-all">
                <div className="relative">
                  {/* Header */}
                  <div className="px-6 pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 text-white grid place-items-center shadow-md">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Override Job Status
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Manually change the status of job #{job.tracking_number}
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
                    {/* Job Info */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Job Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Job ID:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">#{job.tracking_number}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Service:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{job.request.service_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{job.request.contact_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Current Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium bg-${getStatusColor(job.status)}-100 text-${getStatusColor(job.status)}-800 dark:bg-${getStatusColor(job.status)}-900/30 dark:text-${getStatusColor(job.status)}-300`}>
                            {job.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Selection */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Select New Status</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {JOB_STATUSES.map((status) => {
                          const Icon = status.icon;
                          const isSelected = selectedStatus === status.value;
                          const isCurrent = job.status === status.value;
                          
                          return (
                            <button
                              key={status.value}
                              onClick={() => handleStatusChange(status.value)}
                              disabled={isCurrent}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                  ? `border-${status.color}-500 bg-${status.color}-50 dark:bg-${status.color}-900/20`
                                  : isCurrent
                                  ? 'border-gray-300 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 cursor-not-allowed opacity-60'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 ${
                                  isSelected 
                                    ? `text-${status.color}-600 dark:text-${status.color}-400`
                                    : isCurrent
                                    ? 'text-gray-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  isSelected 
                                    ? `text-${status.color}-800 dark:text-${status.color}-200`
                                    : isCurrent
                                    ? 'text-gray-500'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {status.label}
                                </span>
                              </div>
                              <p className={`text-xs ${
                                isSelected 
                                  ? `text-${status.color}-600 dark:text-${status.color}-400`
                                  : isCurrent
                                  ? 'text-gray-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {status.description}
                              </p>
                              {isCurrent && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                                  Current
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reason Input */}
                    <div className="mb-6">
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Status Change *
                      </label>
                      <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a detailed reason for changing the job status..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        This reason will be logged and visible to the customer and provider.
                      </p>
                    </div>

                    {/* Warning */}
                    {isStatusChange && (
                      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                              Status Override Warning
                            </h5>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              You are about to manually override the job status from <strong>{job.status.replace('_', ' ')}</strong> to <strong>{selectedStatus.replace('_', ' ')}</strong>. 
                              This action will be logged and may affect billing, notifications, and customer communications.
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
                      onClick={handleOverride}
                      disabled={!canOverride || loading}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-md shadow-orange-600/20 flex items-center gap-2 transition ${
                        !canOverride || loading ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Override Status
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

export default JobStatusOverride;
