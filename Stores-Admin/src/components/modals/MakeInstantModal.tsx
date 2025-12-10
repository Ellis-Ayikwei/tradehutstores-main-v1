import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Job } from '../../types/job';

interface MakeInstantModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job | null;
    onMakeInstant: (jobId: string) => Promise<void>;
    getStatusBadgeClass: (status: string) => string;
    getStatusIcon: (status: string) => React.ReactNode;
}

const MakeInstantModal: React.FC<MakeInstantModalProps> = ({
    isOpen,
    onClose,
    job,
    onMakeInstant,
    getStatusBadgeClass,
    getStatusIcon,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!job) return;

        setIsSubmitting(true);
        try {
            await onMakeInstant(job.id);
            handleClose();
        } catch (error) {
            console.error('Error making job instant:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen || !job) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FontAwesomeIcon icon={faBolt} className="text-yellow-500" />
                        Make Job Instant
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                </div>

                {/* Job Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job Details</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Job ID</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {job.request?.tracking_number || job.id}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Service Type</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {job.request?.service_type || 'Service Request'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {job.request?.contact_name || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Current Status</p>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                                {getStatusIcon(job.status)}
                                {job.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Base Price</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                                £{job.request?.base_price || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warning/Info */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faBolt} className="text-yellow-600 dark:text-yellow-400 mt-1" />
                        <div>
                            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                                Instant Job Conversion
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                This will convert the job to an instant job, allowing immediate provider assignment without bidding. 
                                The job will be available for instant booking by providers.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-xl shadow-lg shadow-yellow-500/25 hover:shadow-xl hover:shadow-yellow-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Converting...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faBolt} />
                                Make Instant
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MakeInstantModal; 