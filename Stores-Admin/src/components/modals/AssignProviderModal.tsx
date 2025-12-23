import { IconCheck, IconStar, IconTruck, IconUserCheck, IconUsers, IconX } from '@tabler/icons-react';
import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useSelector } from 'react-redux';
import axiosInstance from '../../services/axiosInstance';
import fetcher from '../../services/fetcher';
import showMessage from '../../helper/showMessage';
import { Job } from '../../types/job';

interface AssignProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job | null;
    onAssignProvider: (jobId: string, providerId: string) => Promise<void>;
    getStatusBadgeClass: (status: string) => string;
    getStatusIcon: (status: string) => React.ReactNode;
}

const AssignProviderModal: React.FC<AssignProviderModalProps> = ({ isOpen, onClose, job, onAssignProvider, getStatusBadgeClass, getStatusIcon }) => {
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [assigningProvider, setAssigningProvider] = useState(false);

    // Fetch providers data
    const { data: providersData, isLoading: providersLoading } = useSWR('providers/', fetcher);

    const handleAssignProvider = async () => {
        if (!job || !selectedProvider) {
            showMessage('Please select a provider');
            return;
        }

        setAssigningProvider(true);
        try {
            const response = await axiosInstance.post(`/jobs/${job.id}/assign_provider/`, {
                provider_id: selectedProvider,
            });

            if (response.status === 200) {
                showMessage('Provider assigned successfully!');
                mutate(`/jobs/${job.id}/`);
                mutate(`/jobs/`);
            } else {
                showMessage('Failed to assign provider', 'error');
            }

            onClose();
        } catch (error) {
            console.error('Error assigning provider:', error);
            showMessage('Failed to assign provider. Please try again.', 'error');
        } finally {
            setAssigningProvider(false);
        }
    };

    const handleClose = () => {
        setSelectedProvider('');
        onClose();
    };

    if (!isOpen || !job) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Provider</h2>
                    <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <IconX className="w-6 h-6" />
                    </button>
                </div>

                {/* Job Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Job ID</p>
                            <p className="font-medium text-gray-900 dark:text-white">{job.request?.tracking_number || job.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Title</p>
                            <p className="font-medium text-gray-900 dark:text-white">{job.request?.service_type || 'Service Request'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                            <p className="font-medium text-gray-900 dark:text-white">{job.request?.contact_name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                                {getStatusIcon(job.status)}
                                {job.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Provider Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Provider</label>

                    {providersLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading providers...</span>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {providersData?.map((provider: any) => (
                                <div
                                    key={provider.id}
                                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                                        selectedProvider === provider.id
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                    onClick={() => setSelectedProvider(provider.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                                <IconTruck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-white">{provider.company_name || provider.name}</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {provider.email} • {provider.phone}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <IconStar className="w-4 h-4 text-yellow-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{provider.rating || 'N/A'}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{provider.completed_jobs || 0} jobs completed</span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedProvider === provider.id && (
                                            <div className="p-1 bg-emerald-500 rounded-full">
                                                <IconCheck className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {(!providersData || providersData.length === 0) && (
                                <div className="text-center py-8">
                                    <IconUsers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600 dark:text-gray-400">No providers available</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        disabled={assigningProvider}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssignProvider}
                        disabled={!selectedProvider || assigningProvider}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                            !selectedProvider || assigningProvider
                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }`}
                    >
                        {assigningProvider ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Assigning...
                            </>
                        ) : (
                            <>
                                <IconUserCheck className="w-4 h-4" />
                                Assign Provider
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignProviderModal;
