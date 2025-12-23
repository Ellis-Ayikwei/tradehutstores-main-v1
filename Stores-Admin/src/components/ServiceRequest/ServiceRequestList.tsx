import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faSort, faSortUp, faSortDown, faEye, faEdit, faTrash, faCalendarAlt, faUser, faTruck, faClock } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../services/axiosInstance';
import { ServiceRequest } from '../../types';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';

interface ServiceRequestListProps {
    onSelectRequest?: (request: ServiceRequest) => void;
}

const ServiceRequestList: React.FC<ServiceRequestListProps> = ({ onSelectRequest }) => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        dateRange: '',
    });
    const [sortConfig, setSortConfig] = useState<{
        key: keyof ServiceRequest;
        direction: 'asc' | 'desc';
    }>({
        key: 'createdAt',
        direction: 'desc',
    });

    useEffect(() => {
        fetchServiceRequests();
    }, []);

    const fetchServiceRequests = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/api/service-requests');
            setRequests(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching service requests:', err);
            setError('Failed to load service requests');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: keyof ServiceRequest) => {
        setSortConfig((prevConfig) => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const getSortIcon = (key: keyof ServiceRequest) => {
        if (sortConfig.key !== key) return faSort;
        return sortConfig.direction === 'asc' ? faSortUp : faSortDown;
    };

    const filteredRequests = requests
        .filter((request) => {
            const matchesSearch =
                request.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.status?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilters =
                (!filters.status || request.status === filters.status) &&
                (!filters.type || request.requestType === filters.type) &&
                (!filters.dateRange || matchesDateRange(request.createdAt, filters.dateRange));

            return matchesSearch && matchesFilters;
        })
        .sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined || bValue === undefined) return 0;

            if (sortConfig.direction === 'asc') {
                return aValue > bValue ? 1 : -1;
            }
            return aValue < bValue ? 1 : -1;
        });

    const matchesDateRange = (date: string | undefined, range: string) => {
        if (!date) return false;
        const requestDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (range) {
            case 'today':
                return diffDays === 0;
            case 'week':
                return diffDays <= 7;
            case 'month':
                return diffDays <= 30;
            default:
                return true;
        }
    };

    const handleViewRequest = (request: ServiceRequest) => {
        if (onSelectRequest) {
            onSelectRequest(request);
        } else {
            navigate(`/service-requests/${request.id}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search requests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Types</option>
                        <option value="instant">Instant</option>
                        <option value="journey">Journey</option>
                    </select>
                    <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last Week</option>
                        <option value="month">Last Month</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('id')}
                            >
                                <div className="flex items-center">
                                    ID
                                    <FontAwesomeIcon icon={getSortIcon('id')} className="ml-2" />
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('contactName')}
                            >
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                                    Contact
                                    <FontAwesomeIcon icon={getSortIcon('contactName')} className="ml-2" />
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('requestType')}
                            >
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faTruck} className="mr-2" />
                                    Type
                                    <FontAwesomeIcon icon={getSortIcon('requestType')} className="ml-2" />
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                                    Status
                                    <FontAwesomeIcon icon={getSortIcon('status')} className="ml-2" />
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                                    Created
                                    <FontAwesomeIcon icon={getSortIcon('createdAt')} className="ml-2" />
                                </div>
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{request.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{request.contactName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{request.requestType}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            request.status === 'completed'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                : request.status === 'in_progress'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                : request.status === 'cancelled'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        }`}
                                    >
                                        {request.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{request.createdAt && new Date(request.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleViewRequest(request)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                                        <FontAwesomeIcon icon={faEye} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/service-requests/${request.id}/edit`)}
                                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 mr-4"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            /* TODO: Implement delete functionality */
                                        }}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ServiceRequestList;
