import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface PaymentNotification {
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
    read: boolean;
}

const PaymentNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<PaymentNotification[]>([
        {
            id: '1',
            type: 'info',
            message: 'Payment of $150.00 was successfully processed',
            timestamp: new Date().toISOString(),
            read: false,
        },
        {
            id: '2',
            type: 'warning',
            message: 'Payment method expiring soon',
            timestamp: new Date().toISOString(),
            read: false,
        },
    ]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'info':
                return faInfoCircle;
            case 'warning':
                return faExclamationTriangle;
            case 'error':
                return faExclamationTriangle;
            default:
                return faBell;
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'info':
                return 'text-blue-500';
            case 'warning':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Payment Notifications</h3>
                <span className="text-sm text-gray-500">{notifications.filter((n) => !n.read).length} unread</span>
            </div>
            <div className="space-y-2">
                {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 rounded-lg border ${notification.read ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-start">
                            <FontAwesomeIcon icon={getNotificationIcon(notification.type)} className={`mt-1 mr-3 ${getNotificationColor(notification.type)}`} />
                            <div className="flex-1">
                                <p className="text-sm">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                            </div>
                            {!notification.read && (
                                <button onClick={() => markAsRead(notification.id)} className="text-xs text-blue-600 hover:text-blue-800">
                                    Mark as read
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentNotifications;
