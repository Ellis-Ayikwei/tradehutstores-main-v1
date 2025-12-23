import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faClock, faUndo, faSpinner, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

interface PaymentStatusProps {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    message?: string;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ status, message }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'completed':
                return {
                    icon: faCheckCircle,
                    color: 'text-green-500',
                    bgColor: 'bg-green-50',
                    text: 'Payment Completed',
                };
            case 'failed':
                return {
                    icon: faTimesCircle,
                    color: 'text-red-500',
                    bgColor: 'bg-red-50',
                    text: 'Payment Failed',
                };
            case 'pending':
                return {
                    icon: faClock,
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-50',
                    text: 'Payment Pending',
                };
            case 'processing':
                return {
                    icon: faSpinner,
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-50',
                    text: 'Processing Payment',
                };
            case 'refunded':
                return {
                    icon: faUndo,
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-50',
                    text: 'Payment Refunded',
                };
            default:
                return {
                    icon: faExclamationCircle,
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-50',
                    text: 'Unknown Status',
                };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <div className={`p-4 rounded-lg ${statusConfig.bgColor}`}>
            <div className="flex items-center">
                <FontAwesomeIcon icon={statusConfig.icon} className={`text-xl mr-3 ${statusConfig.color}`} spin={status === 'processing'} />
                <div>
                    <h3 className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.text}</h3>
                    {message && <p className="text-sm text-gray-500 mt-1">{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default PaymentStatus;
