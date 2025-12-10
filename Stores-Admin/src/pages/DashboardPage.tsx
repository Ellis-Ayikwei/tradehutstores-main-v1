import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faFileAlt, faCreditCard, faChartLine } from '@fortawesome/free-solid-svg-icons';

const DashboardPage: React.FC = () => {
    const stats = [
        {
            title: 'Active Vehicles',
            value: '12',
            icon: faTruck,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: 'Service Requests',
            value: '24',
            icon: faFileAlt,
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            title: 'Payments',
            value: '$5,280',
            icon: faCreditCard,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            title: 'Revenue',
            value: '$12,450',
            icon: faChartLine,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className={`${stat.bgColor} p-6 rounded-lg shadow-sm`}>
                        <div className="flex items-center">
                            <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                <FontAwesomeIcon icon={stat.icon} className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Service Requests</h2>
                    <div className="space-y-4">
                        {/* Placeholder for recent service requests */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Request #12345</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Moving Service - In Progress</p>
                            </div>
                            <Link to="/service-requests/12345" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                View Details
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/service-requests/new" className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center hover:bg-blue-100 dark:hover:bg-blue-900/30">
                            <FontAwesomeIcon icon={faFileAlt} className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">New Request</span>
                        </Link>
                        <Link to="/vehicles" className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center hover:bg-green-100 dark:hover:bg-green-900/30">
                            <FontAwesomeIcon icon={faTruck} className="h-6 w-6 text-green-500 mx-auto mb-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Manage Vehicles</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
