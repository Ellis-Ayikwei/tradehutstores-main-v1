import {
    IconBell,
    IconCurrencyDollar,
    IconDeviceFloppy,
    IconGavel,
    IconShield,
    IconStar,
    IconUser,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import showNotification from '../../../../utilities/showNotifcation';

// Status Override Modal
export const StatusOverrideModal: React.FC<any> = ({ isOpen, onClose, onConfirm, currentStatus, isLoading }) => {
    const [newStatus, setNewStatus] = useState('');
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Override Status</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">New Status</label>
                        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full p-3 border rounded-lg">
                            <option value="">Select status...</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="bidding">Bidding in Progress</option>
                            <option value="accepted">Accepted</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_transit">In Transit</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Reason</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3 border rounded-lg" rows={3} placeholder="Reason for status override..." />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            console.log('the override is', newStatus, reason);
                            onConfirm(newStatus, reason);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        disabled={!newStatus || !reason || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Overriding...
                            </>
                        ) : (
                            'Override'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Price Adjustment Modal
export const PriceAdjustmentModal: React.FC<any> = ({ isOpen, onClose, onConfirm, currentPrice, isLoading }) => {
    const [adjustmentType, setAdjustmentType] = useState<'fixed' | 'percentage'>('fixed');
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Adjust Price</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Current Price: £{currentPrice}</label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Adjustment Type</label>
                        <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as any)} className="w-full p-3 border rounded-lg">
                            <option value="fixed">Fixed Amount</option>
                            <option value="percentage">Percentage</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Adjustment Value {adjustmentType === 'percentage' ? '(%)' : '(£)'}</label>
                        <input
                            type="number"
                            value={adjustmentValue}
                            onChange={(e) => setAdjustmentValue(e.target.value)}
                            className="w-full p-3 border rounded-lg"
                            placeholder={adjustmentType === 'percentage' ? '10' : '50.00'}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Reason</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3 border rounded-lg" rows={3} placeholder="Reason for price adjustment..." />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm({ price_adjustment_type: adjustmentType, price: adjustmentValue, reason })}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        disabled={!adjustmentValue || !reason}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

// Refund Modal
export const RefundModal: React.FC<any> = ({ isOpen, onClose, onConfirm, totalAmount, isLoading }) => {
    const [refundAmount, setRefundAmount] = useState('');
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Total Amount: £{totalAmount}</label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Refund Amount (£)</label>
                        <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="0.00" max={totalAmount} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Reason</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3 border rounded-lg" rows={3} placeholder="Reason for refund..." />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm({ refundAmount, reason })}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                        disabled={!refundAmount || !reason || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Processing...
                            </>
                        ) : (
                            'Process Refund'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Driver Assignment Modal Component
export const DriverAssignmentModal: React.FC<any> = ({ isOpen, onClose, onConfirm, currentDriver, isLoading }) => {
    const [selectedDriver, setSelectedDriver] = useState('');
    const [notes, setNotes] = useState('');

    // Mock drivers - replace with actual data
    const availableDrivers = [
        { id: 'D-001', name: 'John Smith', rating: 4.8, company: 'Express Movers Ltd' },
        { id: 'D-002', name: 'Sarah Johnson', rating: 4.6, company: 'Swift Transport' },
        { id: 'D-003', name: 'Mike Wilson', rating: 4.9, company: 'Reliable Moves' },
        { id: 'D-004', name: 'Lisa Brown', rating: 4.5, company: 'City Movers' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-semibold mb-4">{currentDriver ? 'Reassign to Driver' : 'Select Driver'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">{currentDriver ? 'Reassign to Driver' : 'Select Driver'}</label>
                        <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full p-3 border rounded-lg">
                            <option value="">Choose a driver...</option>
                            {availableDrivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.name} - {driver.company} (Rating: {driver.rating})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Assignment Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-3 border rounded-lg"
                            rows={3}
                            placeholder="Add any special instructions or notes for the driver..."
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(selectedDriver, notes)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                        disabled={!selectedDriver || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Assigning...
                            </>
                        ) : (
                            `${currentDriver ? 'Reassign' : 'Assign'} Driver`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Confirm Job Modal Component
export const ConfirmJobModal: React.FC<any> = ({ isOpen, onClose, onConfirm, booking, isLoading }) => {
    const [isBiddable, setIsBiddable] = useState(false);
    const [minimumBid, setMinimumBid] = useState('');
    const [instantPrice, setInstantPrice] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsBiddable(false);
            setMinimumBid('');
            setInstantPrice('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const existingPrice = booking?.final_price || booking?.base_price;
    const hasExistingPrice = existingPrice && existingPrice > 0;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            // Validate inputs
            if (isBiddable && !minimumBid) {
                showNotification({
                    message: 'Please Enter Minimum Bid',
                    type: 'error',
                    showHide: true
                });
                setLoading(false);
                return;
            }

            if (!isBiddable && !hasExistingPrice && !instantPrice) {
                showNotification({
                    message: 'Please enter a price for instant jobs.',
                    type: 'error',
                    showHide: true
                });
                setLoading(false);
                return;
            }

            // Prepare the data
            const jobData = {
                is_biddable: isBiddable,
                minimum_bid: isBiddable ? parseFloat(minimumBid) : null,
                price: !isBiddable && !hasExistingPrice ? parseFloat(instantPrice) : existingPrice,
                admin_confirmed: true,
            };

            await onConfirm(jobData);
        } catch (error) {
            console.error('Error confirming job:', error);
        } finally {
            setLoading(false);
        }
    };

    const isProcessing = loading || isLoading;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <IconGavel className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm as Job</h3>
                </div>

                <div className="space-y-4">
                    {/* Show existing price if available */}
                    {hasExistingPrice && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                <IconCurrencyDollar className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span className="font-medium text-green-800 dark:text-green-200">Existing Price: £{existingPrice}</span>
                            </div>
                        </div>
                    )}

                    <p className="text-gray-600 dark:text-gray-400">This will convert the booking into a job that can be assigned to drivers. Please confirm the job type and pricing:</p>

                    <div className="space-y-3">
                        <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input type="radio" name="jobType" checked={!isBiddable} onChange={() => setIsBiddable(false)} className="mr-3" disabled={isProcessing} />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">Instant Job</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Fixed price, immediate assignment to available driver</div>
                                {!hasExistingPrice && !isBiddable && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Set Price (£)</label>
                                        <input
                                            type="number"
                                            value={instantPrice}
                                            onChange={(e) => setInstantPrice(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                )}
                            </div>
                        </label>

                        <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input type="radio" name="jobType" checked={isBiddable} onChange={() => setIsBiddable(true)} className="mr-3" disabled={isProcessing} />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">Bidding Job</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Drivers can bid on the job, competitive pricing</div>
                                {isBiddable && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Bid (£)</label>
                                        <input
                                            type="number"
                                            value={minimumBid}
                                            onChange={(e) => setMinimumBid(e.target.value)}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                                            placeholder={hasExistingPrice ? `${existingPrice * 0.8}` : '0.00'}
                                            step="0.01"
                                            min="0"
                                            disabled={isProcessing}
                                        />
                                        {hasExistingPrice && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suggested: £{(existingPrice * 0.8).toFixed(2)} (80% of current price)</p>}
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>
                                Job Type: <span className="font-medium">{isBiddable ? 'Bidding' : 'Instant'}</span>
                            </div>
                            {isBiddable && minimumBid && (
                                <div>
                                    Minimum Bid: <span className="font-medium">£{minimumBid}</span>
                                </div>
                            )}
                            {!isBiddable && (hasExistingPrice || instantPrice) && (
                                <div>
                                    Price: <span className="font-medium">£{hasExistingPrice ? existingPrice : instantPrice}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isProcessing || (isBiddable && !minimumBid) || (!isBiddable && !hasExistingPrice && !instantPrice)}
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Confirming...
                            </>
                        ) : (
                            'Confirm as Job'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}; 