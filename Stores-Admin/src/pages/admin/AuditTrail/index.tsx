import React, { useState, useMemo } from 'react';
import {
    IconHistory,
    IconSearch,
    IconFilter,
    IconDownload,
    IconRefresh,
    IconEye,
    IconCalendar,
    IconUser,
    IconActivity,
    IconClock,
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-react';
import { Dialog, Transition } from '@headlessui/react';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import useSWR from 'swr';
import fetcher from '../../../services/fetcher';

interface UserActivity {
    id: string;
    user_details: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        user_type: string;
    };
    activity_type: string;
    request?: {
        id: string;
        title: string;
    };
    created_at: string;
    details?: any;
}

interface ActivityStats {
    users?: {
        total?: number;
        by_type?: {
            customers?: number;
            providers?: number;
            admins?: number;
        };
        by_status?: {
            active?: number;
            inactive?: number;
            pending?: number;
        };
        new_users?: {
            last_1_day?: number;
            last_7_days?: number;
            last_30_days?: number;
        };
    };
    requests?: {
        total?: number;
        by_status?: {
            pending?: number;
            completed?: number;
            cancelled?: number;
        };
        by_period?: {
            last_1_day?: number;
            last_7_days?: number;
            last_30_days?: number;
        };
    };
    bidding?: {
        total_bids?: number;
        by_status?: {
            pending?: number;
            accepted?: number;
            rejected?: number;
        };
    };
    payments?: {
        total?: number;
        by_status?: {
            completed?: number;
            pending?: number;
            failed?: number;
        };
        total_revenue?: number;
    };
    jobs?: {
        total?: number;
        completed?: number;
        in_progress?: number;
    };
    activities?: {
        total?: number;
        by_period?: {
            last_1_day?: number;
            last_7_days?: number;
            last_30_days?: number;
        };
        most_active_users?: Array<{
            user__email?: string;
            activity_count?: number;
        }>;
        common_activities?: Array<{
            activity_type?: string;
            count?: number;
        }>;
    };
    generated_at?: string;
}

const AuditTrail: React.FC = () => {
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [activityTypeFilter, setActivityTypeFilter] = useState<string>('');
    const [userFilter, setUserFilter] = useState<string>('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    
    // Modal state
    const [selectedActivity, setSelectedActivity] = useState<UserActivity | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    
    // Activity types for filter
    const activityTypes = [
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'register', label: 'Registration' },
        { value: 'create_request', label: 'Create Request' },
        { value: 'update_request', label: 'Update Request' },
        { value: 'cancel_request', label: 'Cancel Request' },
        { value: 'place_bid', label: 'Place Bid' },
        { value: 'update_bid', label: 'Update Bid' },
        { value: 'create_user', label: 'Create User' },
        { value: 'update_user', label: 'Update User' },
        { value: 'delete_user', label: 'Delete User' },
        { value: 'suspend_user', label: 'Suspend User' },
        { value: 'activate_user', label: 'Activate User' },
        { value: 'upload_file', label: 'Upload File' },
        { value: 'download_file', label: 'Download File' },
        { value: 'api_call', label: 'API Call' },
    ];

    // Build query parameters for activities
    const activitiesParams = useMemo(() => {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (activityTypeFilter) params.append('activity_type', activityTypeFilter);
        if (userFilter) params.append('user', userFilter);
        if (dateRange.start) params.append('start_date', dateRange.start);
        if (dateRange.end) params.append('end_date', dateRange.end);
        return params.toString();
    }, [searchTerm, activityTypeFilter, userFilter, dateRange]);

    // SWR hooks for data fetching
    const { 
        data: activitiesData, 
        error: activitiesError, 
        isLoading: activitiesLoading,
        mutate: mutateActivities 
    } = useSWR(
        `/activities/?${activitiesParams}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 30000, // Refresh every 30 seconds
        }
    );

    console.log("the activities data is", activitiesData);

    const { 
        data: statsData, 
        error: statsError, 
        isLoading: statsLoading 
    } = useSWR(
        '/activities/stats/',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 60000, // Refresh every minute
        }
    );

    // Extract data from SWR responses
    const activities = activitiesData?.results || activitiesData || [];
    const stats = statsData;
    const loading = activitiesLoading || statsLoading;
    const error = activitiesError || statsError;

    // Format activity type for display
    const formatActivityType = (type: string) => {
        const typeMap: { [key: string]: string } = {
            login: 'Logged In',
            logout: 'Logged Out',
            register: 'Registered',
            create_request: 'Created Request',
            update_request: 'Updated Request',
            cancel_request: 'Cancelled Request',
            place_bid: 'Placed Bid',
            update_bid: 'Updated Bid',
            create_user: 'Created User',
            update_user: 'Updated User',
            delete_user: 'Deleted User',
            suspend_user: 'Suspended User',
            activate_user: 'Activated User',
            upload_file: 'Uploaded File',
            download_file: 'Downloaded File',
            api_call: 'API Call',
        };
        return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Get activity icon based on type
    const getActivityIcon = (type: string) => {
        if (type.includes('login')) return '🔐';
        if (type.includes('logout')) return '🚪';
        if (type.includes('create')) return '➕';
        if (type.includes('update')) return '✏️';
        if (type.includes('delete')) return '🗑️';
        if (type.includes('upload')) return '📤';
        if (type.includes('download')) return '📥';
        if (type.includes('bid')) return '💰';
        if (type.includes('request')) return '📋';
        return '📝';
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // Get activity badge color
    const getActivityBadgeColor = (type: string) => {
        if (type.includes('login') || type.includes('activate')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (type.includes('logout') || type.includes('delete') || type.includes('cancel')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        if (type.includes('update') || type.includes('modify')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        if (type.includes('create') || type.includes('register')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    };

    const columns: ColumnDefinition[] = [
        {
            accessor: 'activity_info',
            title: 'Activity',
            width: '30%',
            render: (item: UserActivity) => (
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-lg">{getActivityIcon(item.activity_type)}</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatActivityType(item.activity_type)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.request ? `Request: ${item.request.title}` : 'System Activity'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            accessor: 'user_details',
            title: 'User',
            width: '20%',
            render: (item: UserActivity) => (
                <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.user_details.first_name} {item.user_details.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.user_details.email}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                        {item.user_details.user_type}
                    </div>
                </div>
            ),
        },
        {
            accessor: 'activity_type',
            title: 'Type',
            width: '15%',
            render: (item: UserActivity) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActivityBadgeColor(item.activity_type)}`}>
                    {formatActivityType(item.activity_type)}
                </span>
            ),
        },
        {
            accessor: 'created_at',
            title: 'Timestamp',
            width: '15%',
            sortable: true,
            render: (item: UserActivity) => (
                <div>
                    <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(item.created_at)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                    </div>
                </div>
            ),
        },
        {
            accessor: 'details',
            title: 'Details',
            width: '10%',
            textAlign: 'center',
            render: (item: UserActivity) => (
                <button
                    onClick={() => {
                        setSelectedActivity(item);
                        setShowDetailsModal(true);
                    }}
                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="View Details"
                >
                    <IconEye className="w-4 h-4" />
                </button>
            ),
        },
    ];

    if (error) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <IconHistory className="w-12 h-12 text-red-500" />
                    <p className="text-red-600 dark:text-red-400">
                        {error?.message || 'Failed to fetch audit trail data'}
                    </p>
                    <button 
                        onClick={() => mutateActivities()} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (loading && !activities.length) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading audit trail data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Trail</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Track all user activities and system events</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            mutateActivities();
                        }}
                        disabled={activitiesLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                            activitiesLoading 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        <IconRefresh className={`w-4 h-4 ${activitiesLoading ? 'animate-spin' : ''}`} />
                        {activitiesLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={() => {
                            // Export functionality
                            const csvContent = activities.map((activity: UserActivity) => 
                                `${activity.user.email},${formatActivityType(activity.activity_type)},${formatDate(activity.created_at)},${activity.request?.title || 'N/A'}`
                            ).join('\n');
                            const blob = new Blob([`User,Activity,Timestamp,Request\n${csvContent}`], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        <IconDownload className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {statsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
                                    <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <IconActivity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats.activities?.total || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <IconClock className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Today's Activities</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats.activities?.by_period?.last_1_day || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <IconUser className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats.users?.total || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <IconActivity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Most Active</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {stats.activities?.most_active_users?.[0]?.user__email?.split('@')[0] || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {stats.activities?.most_active_users?.[0]?.activity_count || 0} activities
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="text-gray-400 w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search activities..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Activity Type</label>
                        <FilterSelect
                            options={activityTypes}
                            value={activityTypeFilter}
                            placeholder="All Types"
                            onChange={(val) => setActivityTypeFilter(val ? String(val) : '')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <DraggableDataTable
                data={activities}
                columns={columns}
                loading={loading}
                title="Activity Log"
                exportFileName="audit-trail"
                storeKey="audit-trail-table"
                onRefreshData={() => mutateActivities()}
                quickCheckFields={['user_details.email', 'activity_type', 'request.title']}
            />

            {/* Activity Details Modal */}
            <Transition appear show={showDetailsModal} as={React.Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowDetailsModal(false)}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                        Activity Details
                                    </Dialog.Title>

                                    {selectedActivity && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {selectedActivity.user.first_name} {selectedActivity.user.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedActivity.user.email}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Activity Type</label>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {formatActivityType(selectedActivity.activity_type)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</label>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {formatDate(selectedActivity.created_at)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Request</label>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {selectedActivity.request?.title || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {selectedActivity.details && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Details</label>
                                                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-900 dark:text-white overflow-auto max-h-64">
                                                        {JSON.stringify(selectedActivity.details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end mt-6">
                                        <button
                                            onClick={() => setShowDetailsModal(false)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default AuditTrail;
