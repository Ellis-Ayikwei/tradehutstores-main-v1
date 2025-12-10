import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  AlertCircle, 
  X, 
  Settings, 
  CheckCircle,
  Save,
  AlertTriangle,
  Info,
  Clock,
  UserCheck,
  Route,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';
import showNotification from '../../../../../utilities/showNotifcation';

interface OverrideStatusModalProps {
  open: boolean;
  onClose: () => void;
  job: any;
  currentStatus: string;
  loading?: boolean;
  onSuccess?: () => void;
}

const statusOptions = [
  { value: 'draft', label: 'Draft', icon: Settings, color: 'gray', description: 'Job is being prepared' },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'amber', description: 'Awaiting provider assignment' },
  { value: 'bidding', label: 'Bidding', icon: AlertCircle, color: 'purple', description: 'Open for provider bids' },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'blue', description: 'Provider has accepted the job' },
  { value: 'assigned', label: 'Assigned', icon: UserCheck, color: 'cyan', description: 'Provider and resources assigned' },
  { value: 'in_transit', label: 'In Transit', icon: Route, color: 'orange', description: 'Job is currently being executed' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'green', description: 'Job has been successfully completed' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'red', description: 'Job has been cancelled' },
];

const OverrideStatusModal: React.FC<OverrideStatusModalProps> = ({ 
  open, 
  onClose, 
  job,
  currentStatus,
  loading = false,
  onSuccess
}) => {
  const [newStatus, setNewStatus] = useState<string>(currentStatus);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setNewStatus(currentStatus);
      setReason('');
      setError(null);
    }
  }, [open, currentStatus]);

  const handleSubmit = async () => {
    if (!newStatus) {
      setError('Please select a new status');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the status change');
      return;
    }

    if (newStatus === currentStatus) {
      setError('Please select a different status');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = {
        new_status: newStatus,
        reason: reason.trim(),
      };
      
      const response = await axiosInstance.patch(`/jobs/${job.id}/override_status/`, payload);
      
      if (response.status === 200 || response.status === 201) {
        showNotification({ message: "Status updated successfully", type: "success", showHide: true });
        onSuccess?.(); // Call the success callback to refresh parent data
      }
      
      onClose();
    } catch (err) {
      setError('Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  const currentStatusInfo = getStatusInfo(currentStatus);
  const newStatusInfo = getStatusInfo(newStatus);

  const getStatusColor = (color: string) => {
    const colors = {
      gray: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300',
      amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
      purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
      blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
      cyan: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300',
      orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300',
      green: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
      red: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

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
                    <div className="flex items-center justify-center relative">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center shadow-md">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Override Job Status
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Change the status of this job with proper justification.
                          </Dialog.Description>
                        </div>
                      </div>
                      <button 
                        onClick={onClose} 
                        className="absolute right-0 p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    {/* Current Status Display */}
                    <div className="mb-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                          <currentStatusInfo.icon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Current Status</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatusInfo.color)}`}>
                            {currentStatusInfo.label}
                          </span>
                          <span className="text-sm text-blue-600 dark:text-blue-300">
                            {currentStatusInfo.description}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          Job ID: {job?.id || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Status Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        New Status *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {statusOptions.map((option) => {
                          const Icon = option.icon;
                          const isSelected = newStatus === option.value;
                          const isCurrentStatus = option.value === currentStatus;
                          
                          return (
                            <div
                              key={option.value}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : isCurrentStatus
                                  ? 'border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                              onClick={() => !isCurrentStatus && setNewStatus(option.value)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isSelected 
                                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                  <Icon className={`w-4 h-4 ${
                                    isSelected ? 'text-blue-600' : 'text-gray-500'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {option.description}
                                  </div>
                                </div>
                                {isCurrentStatus && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Current
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reason Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Status Change *
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                        placeholder="Please provide a detailed reason for this status change..."
                      />
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This reason will be logged for audit purposes.
                      </div>
                    </div>

                    {/* Status Change Preview */}
                    {newStatus !== currentStatus && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Change Preview</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatusInfo.color)}`}>
                            {currentStatusInfo.label}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(newStatusInfo.color)}`}>
                            {newStatusInfo.label}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Warning Notice */}
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Status Override Notice
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            This action will immediately update the job status and may trigger notifications to relevant parties. 
                            Ensure the new status accurately reflects the current state of the job.
                          </p>
                        </div>
                      </div>
                    </div>

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
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !newStatus || !reason.trim() || newStatus === currentStatus}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 flex items-center gap-2 transition ${
                        isSubmitting || !newStatus || !reason.trim() || newStatus === currentStatus ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Status
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

export default OverrideStatusModal;
