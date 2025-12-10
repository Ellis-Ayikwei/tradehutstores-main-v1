import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign, faChartLine, faCalendarAlt, faCreditCard } from '@fortawesome/free-solid-svg-icons';

interface PaymentAnalyticsProps {
    totalSpent: number;
    paymentCount: number;
    averageAmount: number;
    paymentMethods: {
        type: string;
        count: number;
    }[];
}

const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({ totalSpent, paymentCount, averageAmount, paymentMethods }) => {
    const stats = [
        {
            title: 'Total Spent',
            value: `$${totalSpent.toFixed(2)}`,
            icon: faDollarSign,
            color: 'text-green-500',
        },
        {
            title: 'Total Payments',
            value: paymentCount.toString(),
            icon: faChartLine,
            color: 'text-blue-500',
        },
        {
            title: 'Average Amount',
            value: `$${averageAmount.toFixed(2)}`,
            icon: faCalendarAlt,
            color: 'text-purple-500',
        },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium">Payment Analytics</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={stat.icon} className={`text-xl mr-3 ${stat.color}`} />
                            <div>
                                <p className="text-sm text-gray-500">{stat.title}</p>
                                <p className="text-lg font-semibold">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Payment Methods Distribution</h4>
                <div className="space-y-3">
                    {paymentMethods.map((method, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faCreditCard} className="text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600 capitalize">{method.type}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{method.count}</span>
                                <span className="text-xs text-gray-500 ml-1">({((method.count / paymentCount) * 100).toFixed(0)}%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaymentAnalytics;
