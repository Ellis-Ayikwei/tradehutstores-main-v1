import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faTimes, 
    faUser, 
    faPoundSign, 
    faMessage,
    faSearch,
    faDollarSign,
    faCalendarAlt,
    faClock,
    faTruck,
    faPhone,
    faEnvelope,
    faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { Job } from '../../types/job';
import axiosInstance from '../../services/axiosInstance';
import showMessage from '../../helper/showMessage';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ServiceRequest } from '../../types';
import { addBid } from '../../store/slices/serviceRequestSice';
import { RootState } from '../../store';

interface AddBidModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
    onBidAdded?: () => void;
}

const AddBidModal: React.FC<AddBidModalProps> = ({
    isOpen,
    onClose,
    job,
    onBidAdded
}) => {
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [bidAmount, setBidAmount] = useState<string>('');
    const [bidMessage, setBidMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Fetch providers data
    const { data: providersData, isLoading: providersLoading } = useSWR('providers/', fetcher);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider || !bidAmount || !job) {
            showMessage('error', 'Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post(`/bids/`, {
                job_id: job.id,
                provider_id: selectedProvider,
                amount: parseFloat(bidAmount),
                message: bidMessage || undefined
            });

            if (response.status === 201) {
                showMessage('success', 'Bid added successfully!');
                onBidAdded?.();
                handleClose();
            }
        } catch (error) {
            console.error('Error adding bid:', error);
            showMessage('error', 'Failed to add bid');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedProvider('');
        setBidAmount('');
        setBidMessage('');
        setSearchTerm('');
        setIsSubmitting(false);
        onClose();
    };

    // Filter providers based on search term
    const filteredProviders = providersData?.filter((provider: any) => 
        provider.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const modalContent = (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[9999]">
            {/* The backdrop, rendered as a fixed sibling to the panel container */}
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

            {/* Full-screen container to center the panel */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FontAwesomeIcon icon={faPlus} className="text-green-500" />
                            Add Bid for Provider
                        </Dialog.Title>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Job ID:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {job.request?.tracking_number || job.id}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Service Type:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {job.request?.service_type || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Base Price:</span>
                                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                                    £{job.request?.base_price || 0}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Current Bids:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {job.bids?.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Provider Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-500" />
                                Select Provider *
                            </label>
                            
                            {/* Search Box */}
                            <div className="mb-3">
                                <div className="relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search providers by name, company, or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {providersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading providers...</span>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl p-3">
                                    {filteredProviders.map((provider: any) => (
                                        <div
                                            key={provider.id}
                                            className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                                                selectedProvider === provider.id
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                            onClick={() => setSelectedProvider(provider.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                        <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {provider.company_name || provider.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {provider.email} • {provider.phone}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex items-center gap-1">
                                                                <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-yellow-500" />
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {provider.rating || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                {provider.completed_jobs || 0} jobs completed
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedProvider === provider.id && (
                                                    <div className="p-1 bg-blue-500 rounded-full">
                                                        <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {filteredProviders.length === 0 && (
                                        <div className="text-center py-8">
                                            <FontAwesomeIcon icon={faUser} className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {searchTerm ? 'No providers found matching your search' : 'No providers available'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bid Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <FontAwesomeIcon icon={faPoundSign} className="mr-2 text-green-500" />
                                Bid Amount (£) *
                            </label>
                            <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter bid amount"
                                min="0"
                                step="0.01"
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Base price: £{job.request?.base_price || 0}
                            </p>
                        </div>

                        {/* Bid Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <FontAwesomeIcon icon={faMessage} className="mr-2 text-purple-500" />
                                Message (optional)
                            </label>
                            <textarea
                                value={bidMessage}
                                onChange={(e) => setBidMessage(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                                placeholder="Add a message or notes for this bid..."
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
                                disabled={isSubmitting || !selectedProvider || !bidAmount}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Adding Bid...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faPlus} />
                                        Add Bid
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );

    // Use portal to render at document root
    return isOpen ? createPortal(modalContent, document.body) : null;
};

export default AddBidModal; 