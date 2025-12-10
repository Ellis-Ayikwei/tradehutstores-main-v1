import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faEdit, 
    faTimes, 
    faPoundSign, 
    faMessage,
    faDollarSign,
    faCalendarAlt,
    faClock,
    faTruck,
    faUser,
    faPhone,
    faEnvelope,
    faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { Bid, Job } from '../../types/job';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ServiceRequest } from '../../types';
import { updateBid } from '../../store/slices/serviceRequestSice';
import { RootState } from '../../store';
import axiosInstance from '../../services/axiosInstance';
import showMessage from '../../helper/showMessage';

interface EditBidModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
    bid: Bid | null;
    onBidUpdated?: () => void;
}

const EditBidModal: React.FC<EditBidModalProps> = ({
    isOpen,
    onClose,
    job,
    bid,
    onBidUpdated
}) => {
    const [editAmount, setEditAmount] = useState<string>('');
    const [editMessage, setEditMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form when bid changes
    useEffect(() => {
        if (bid) {
            setEditAmount(bid.amount?.toString() || '');
            setEditMessage(bid.notes || '');
        }
    }, [bid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bid || !editAmount) {
            showMessage('error', 'Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.patch(`/bids/${bid.id}/`, {
                amount: parseFloat(editAmount),
                notes: editMessage || undefined
            });

            if (response.status === 200) {
                showMessage('success', 'Bid updated successfully!');
                onBidUpdated?.();
                handleClose();
            }
        } catch (error) {
            console.error('Error updating bid:', error);
            showMessage('error', 'Failed to update bid');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setEditAmount('');
        setEditMessage('');
        setIsSubmitting(false);
        onClose();
    };

    if (!bid) return null;

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[9999]">
            {/* The backdrop, rendered as a fixed sibling to the panel container */}
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

            {/* Full-screen container to center the panel */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FontAwesomeIcon icon={faEdit} className="text-blue-500" />
                            Edit Bid
                        </Dialog.Title>
                        <button
                            onClick={handleClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Bid Details */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bid Details</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {bid.provider?.company_name || bid.provider?.name || 'Unknown Provider'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Job ID:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {job.request?.tracking_number || job.id}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Original Amount:</span>
                                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                                    £{bid.amount || '0.00'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                                    {bid.status || 'pending'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Bid Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <FontAwesomeIcon icon={faPoundSign} className="mr-2 text-green-500" />
                                Bid Amount (£) *
                            </label>
                            <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter new bid amount"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        {/* Bid Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <FontAwesomeIcon icon={faMessage} className="mr-2 text-purple-500" />
                                Message (optional)
                            </label>
                            <textarea
                                value={editMessage}
                                onChange={(e) => setEditMessage(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                                placeholder="Update the message or notes for this bid..."
                            />
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
                                disabled={isSubmitting || !editAmount}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Saving...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faEdit} />
                                        Save Changes
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default EditBidModal; 