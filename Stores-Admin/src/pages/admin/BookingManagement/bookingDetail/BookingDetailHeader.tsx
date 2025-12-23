import {
    IconAdjustments,
    IconArrowLeft,
    IconCurrencyDollar,
    IconGavel,
    IconRefresh,
    IconEdit,
} from '@tabler/icons-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BookingDetailHeaderProps {
    booking: any;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onStatusOverride: () => void;
    onPriceAdjustment: () => void;
    onRefund: () => void;
    onConfirmJob: () => void;
    onRefresh?: () => void;
}

const BookingDetailHeader: React.FC<BookingDetailHeaderProps> = ({
    booking,
    activeTab,
    setActiveTab,
    onStatusOverride,
    onPriceAdjustment,
    onRefund,
    onConfirmJob,
    onRefresh,
}) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/admin/bookings')} 
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <IconArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Admin: Booking #{booking.tracking_number}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Created {new Date(booking.created_at).toLocaleDateString()} • 
                                Customer: {booking.user?.first_name} {booking.user?.last_name} • 
                                Status: {booking.status}
                            </p>
                        </div>
                    </div>

                    {/* Quick Admin Actions */}
                    <div className="flex gap-2">
                        <button 
                            onClick={onRefresh} 
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            title="Refresh booking data"
                        >
                            <IconRefresh className="w-4 h-4" />
                            Refresh
                        </button>
                        <button 
                            onClick={() => navigate(`/admin/requests/${booking.id}/edit`)} 
                            className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                        >
                            <IconEdit className="w-4 h-4" />
                            Edit
                        </button>
                        {/* <button 
                            onClick={onStatusOverride} 
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <IconAdjustments className="w-4 h-4" />
                            Override
                        </button>
                        <button 
                            onClick={onPriceAdjustment} 
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            <IconCurrencyDollar className="w-4 h-4" />
                            Adjust
                        </button>
                        <button 
                            onClick={onRefund} 
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                            <IconRefresh className="w-4 h-4" />
                            Refund
                        </button>
                        <button 
                            onClick={onConfirmJob} 
                            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                            <IconGavel className="w-4 h-4" />
                            Confirm as Job
                        </button> */}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
                    {[
                        { key: 'overview', label: 'Overview', icon: 'IconEye' },
                        { key: 'financial', label: 'Financial', icon: 'IconCurrencyDollar' },
                        { key: 'operations', label: 'Operations', icon: 'IconSettings' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                activeTab === tab.key 
                                    ? 'border-emerald-500 text-emerald-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BookingDetailHeader; 