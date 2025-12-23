import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faTimes, faClock, faPoundSign, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { Job } from '../../types/job';
import renderErrorMessage from '../../helper/renderErrorMessage';

interface MakeBiddableModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job | null;
    onMakeBiddable: (jobId: string, payload: { bidding_duration_hours?: number; minimum_bid?: number }) => Promise<void>;
    getStatusBadgeClass: (status: string) => string;
    getStatusIcon: (status: string) => React.ReactNode;
}

const MakeBiddableModal: React.FC<MakeBiddableModalProps> = ({
    isOpen,
    onClose,
    job,
    onMakeBiddable,
    getStatusBadgeClass,
    getStatusIcon,
}) => {
    const [biddingDurationHours, setBiddingDurationHours] = useState<number>(24);
    const [minimumBid, setMinimumBid] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!job) return;

        setError(null);
        setIsSubmitting(true);
        try {
            const payload: { bidding_duration_hours?: number; minimum_bid?: number } = {
                bidding_duration_hours: biddingDurationHours,
            };

            if (minimumBid && !isNaN(parseFloat(minimumBid))) {
                payload.minimum_bid = parseFloat(minimumBid);
            }

            await onMakeBiddable(job.id, payload);
            handleClose();
        } catch (error) {
            console.error('Error making job biddable:', error);
            const errorMessage = renderErrorMessage(error);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setBiddingDurationHours(24);
        setMinimumBid('');
        setIsSubmitting(false);
        setError(null);
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
                        <FontAwesomeIcon icon={faGavel} className="text-purple-500" />
                        Make Job Biddable
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

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex items-start gap-3">
                            <FontAwesomeIcon 
                                icon={faExclamationCircle} 
                                className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" 
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Error
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    {error}
                                </p>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                aria-label="Dismiss error"
                            >
                                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Bidding Configuration Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <FontAwesomeIcon icon={faClock} className="mr-2 text-purple-500" />
                            Bidding Duration (hours)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="168" // 1 week max
                            value={biddingDurationHours}
                            onChange={(e) => setBiddingDurationHours(parseInt(e.target.value) || 24)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="24"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            How long providers can submit bids (1-168 hours)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <FontAwesomeIcon icon={faPoundSign} className="mr-2 text-purple-500" />
                            Minimum Bid (optional)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={minimumBid}
                            onChange={(e) => setMinimumBid(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Leave empty for no minimum"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Minimum bid amount providers must meet
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Converting...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faGavel} />
                                    Make Biddable
                                </div>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MakeBiddableModal; 