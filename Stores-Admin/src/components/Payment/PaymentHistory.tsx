import React, { useEffect } from 'react';
import { usePayment } from '../../hooks/usePayment';
import { Payment } from '../../store/slices/paymentSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faClock, faUndo, faSpinner } from '@fortawesome/free-solid-svg-icons';

interface PaymentHistoryProps {
    requestId?: string;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ requestId }) => {
    const { payments, loading, error, getPayments } = usePayment();

    useEffect(() => {
        getPayments(requestId);
    }, [requestId]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return { icon: faCheckCircle, color: 'text-green-500' };
            case 'failed':
                return { icon: faTimesCircle, color: 'text-red-500' };
            case 'pending':
                return { icon: faClock, color: 'text-yellow-500' };
            case 'processing':
                return { icon: faSpinner, color: 'text-blue-500' };
            case 'refunded':
                return { icon: faUndo, color: 'text-gray-500' };
            default:
                return { icon: faClock, color: 'text-gray-500' };
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return <div>Loading payment history...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Payment History</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {payments.map((payment: Payment) => {
                            const statusIcon = getStatusIcon(payment.status);
                            return (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{payment.transaction_id}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">${payment.amount.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FontAwesomeIcon icon={statusIcon.icon} className={`mr-2 ${statusIcon.color}`} />
                                            <span className="text-sm text-gray-900 capitalize">{payment.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{formatDate(payment.completed_at)}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentHistory;
