import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faClock, 
    faUser, 
    faStar, 
    faCheck, 
    faTrash, 
    faEdit, 
    faTimes,
    faCrown,
    faEye,
    faBan,
    faMapMarkerAlt,
    faBox,
    faDollarSign,
    faPhone,
    faEnvelope,
    faTruck
} from '@fortawesome/free-solid-svg-icons';
import { Bid, Job } from '../../types/job';
import { ServiceRequest } from '../../types';
import { addBid, updateBid } from '../../store/slices/serviceRequestSice';
import { RootState } from '../../store';
import axiosInstance from '../../services/axiosInstance';
import showMessage from '../../helper/showMessage';

interface JobBiddingProps {
    job: Job;
    onBidSubmit: (bid: Bid) => void;
    isAdmin?: boolean;
    onBidUpdate?: () => void;
}

const JobBidding: React.FC<JobBiddingProps> = ({ 
    job, 
    onBidSubmit, 
    isAdmin = false,
    onBidUpdate 
}) => {
    const [bidAmount, setBidAmount] = useState<string>('');
    const [bidMessage, setBidMessage] = useState<string>('');
    const [isSubmittingBid, setIsSubmittingBid] = useState(false);
    const [editingBid, setEditingBid] = useState<Bid | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');
    const [editMessage, setEditMessage] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);

    const handleSubmitBid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bidAmount || !job) return;

        setIsSubmittingBid(true);
        try {
            const newBid: Bid = {
                id: `BID-${Date.now()}`,
                provider: 'YOUR-PROVIDER-ID',
                amount: parseFloat(bidAmount),
                message: bidMessage,
                createdAt: new Date().toISOString(),
                status: 'pending',
            };

            onBidSubmit(newBid);

            // Clear the form
            setBidAmount('');
            setBidMessage('');
        } catch (error) {
            console.error('Error submitting bid:', error);
        } finally {
            setIsSubmittingBid(false);
        }
    };

    // Admin functions
    const handleAcceptBid = async (bidId: string) => {
        if (!confirm('Are you sure you want to accept this bid? This will assign the provider to the job.')) {
            return;
        }

        setIsAccepting(bidId);
        try {
            const response = await axiosInstance.post(`/jobs/${job.id}/accept-bid/`, {
                bidId: bidId
            });

            if (response.status === 200) {
                showMessage('success', 'Bid accepted successfully!');
                onBidUpdate?.();
            }
        } catch (error) {
            console.error('Error accepting bid:', error);
            showMessage('error', 'Failed to accept bid');
        } finally {
            setIsAccepting(null);
        }
    };

    const handleDeleteBid = async (bidId: string) => {
        if (!confirm('Are you sure you want to delete this bid? This action cannot be undone.')) {
            return;
        }

        setIsDeleting(bidId);
        try {
            const response = await axiosInstance.delete(`/jobs/${job.id}/bids/${bidId}/`);

            if (response.status === 204) {
                showMessage('success', 'Bid deleted successfully!');
                onBidUpdate?.();
            }
        } catch (error) {
            console.error('Error deleting bid:', error);
            showMessage('error', 'Failed to delete bid');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleEditBid = async (bid: Bid) => {
        setEditingBid(bid);
        setEditAmount(bid.amount.toString());
        setEditMessage(bid.message || '');
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!editingBid || !editAmount) return;

        setIsEditing(true);
        try {
            const response = await axiosInstance.patch(`/jobs/${job.id}/bids/${editingBid.id}/`, {
                amount: parseFloat(editAmount),
                message: editMessage
            });

            if (response.status === 200) {
                showMessage('success', 'Bid updated successfully!');
                onBidUpdate?.();
                handleCancelEdit();
            }
        } catch (error) {
            console.error('Error updating bid:', error);
            showMessage('error', 'Failed to update bid');
        } finally {
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingBid(null);
        setEditAmount('');
        setEditMessage('');
        setIsEditing(false);
    };

    const getBidStatusBadge = (bid: Bid) => {
        switch (bid.status) {
            case 'accepted':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full font-semibold">
                        <FontAwesomeIcon icon={faCrown} className="w-3 h-3" />
                        ACCEPTED
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full font-semibold">
                        <FontAwesomeIcon icon={faBan} className="w-3 h-3" />
                        REJECTED
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded-full font-semibold">
                        <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                        PENDING
                    </span>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Auction Details</h2>
                    {isAdmin && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs rounded-full font-semibold">
                            ADMIN VIEW
                        </span>
                    )}
                </div>
            </div>

            <div className="px-6 py-4">
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bidding Ends</h3>
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faClock} className="text-gray-500 dark:text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {job.bidding_end_time ? new Date(job.bidding_end_time).toLocaleDateString() : 'No deadline set'}
                        </span>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Bids</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {job.bids?.length || 0} bid{(job.bids?.length || 0) !== 1 ? 's' : ''}
                        </span>
                    </div>
                    
                    <div className="space-y-4">
                        {job.bids?.map((bid) => (
                            <div key={bid.id} className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3">
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">{bid.provider}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getBidStatusBadge(bid)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {isAdmin && bid.status === 'pending' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAcceptBid(bid.id)}
                                                disabled={isAccepting === bid.id}
                                                className="p-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50"
                                                title="Accept Bid"
                                            >
                                                {isAccepting === bid.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                                                ) : (
                                                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                                                )}
                                            </button>
                                            
                                            <button
                                                onClick={() => handleEditBid(bid)}
                                                className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                                title="Edit Bid"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                                            </button>
                                            
                                            <button
                                                onClick={() => handleDeleteBid(bid.id)}
                                                disabled={isDeleting === bid.id}
                                                className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                                                title="Delete Bid"
                                            >
                                                {isDeleting === bid.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                                                ) : (
                                                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">£{bid.amount.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Bid placed {new Date(bid.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    
                                    {bid.message && (
                                        <div className="max-w-xs">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                                "{bid.message}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {(!job.bids || job.bids.length === 0) && (
                            <div className="text-center py-8">
                                <FontAwesomeIcon icon={faEye} className="text-4xl text-gray-400 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">No bids yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Summary */}
                {isAdmin && job.bids && job.bids.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Admin Summary</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-blue-700 dark:text-blue-300">Total Bids:</span>
                                <span className="ml-2 font-semibold text-blue-900 dark:text-blue-100">{job.bids.length}</span>
                            </div>
                            <div>
                                <span className="text-blue-700 dark:text-blue-300">Lowest Bid:</span>
                                <span className="ml-2 font-semibold text-blue-900 dark:text-blue-100">
                                    £{Math.min(...job.bids.map(b => b.amount)).toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="text-blue-700 dark:text-blue-300">Highest Bid:</span>
                                <span className="ml-2 font-semibold text-blue-900 dark:text-blue-100">
                                    £{Math.max(...job.bids.map(b => b.amount)).toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="text-blue-700 dark:text-blue-300">Average Bid:</span>
                                <span className="ml-2 font-semibold text-blue-900 dark:text-blue-100">
                                    £{(job.bids.reduce((sum, b) => sum + b.amount, 0) / job.bids.length).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Bid Modal */}
                {isEditing && editingBid && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Bid</h3>
                                <button
                                    onClick={handleCancelEdit}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Bid Amount (£)
                                    </label>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Message (optional)
                                    </label>
                                    <textarea
                                        value={editMessage}
                                        onChange={(e) => setEditMessage(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={isEditing}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                Saving...
                                            </div>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Only show bid form for non-admin users */}
                {!isAdmin && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Place Your Bid</h3>
                        <form onSubmit={handleSubmitBid} className="space-y-4">
                            <div>
                                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Bid Amount (£)
                                </label>
                                <input
                                    type="number"
                                    id="bidAmount"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="bidMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Message (optional)
                                </label>
                                <textarea
                                    id="bidMessage"
                                    value={bidMessage}
                                    onChange={(e) => setBidMessage(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmittingBid}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingBid ? 'Submitting...' : 'Submit Bid'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobBidding;
