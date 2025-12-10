import {
    IconAlertCircle,
    IconBolt,
    IconCalendar,
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconClock,
    IconClockHour4,
    IconCurrencyDollar,
    IconDownload,
    IconEdit,
    IconEye,
    IconFilter,
    IconFilterOff,
    IconGavel,
    IconInfoCircle,
    IconLoader,
    IconMapPin,
    IconPackage,
    IconRefresh,
    IconSearch,
    IconTarget,
    IconTrash,
    IconTruck,
    IconUser,
    IconUserCheck,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import AssignProviderModal from '../../../components/modals/AssignProviderModal';
import { BulkStatusOverride, PriceOverrideModal } from './JobDetails/components';
import DraggableDataTable from '../../../components/ui/DraggableDataTable';
import axiosInstance from '../../../services/axiosInstance';
import confirmDialog from '../../../helper/confirmDialog';
import fetcher from '../../../services/fetcher';
import showMessage from '../../../helper/showMessage';
import showRequestError from '../../../helper/showRequestError';
import { Eye, Plus } from 'lucide-react';
import EnterpriseDateTime from '../../../utilities/EnterpriseDateTime';

interface Job {
    id: string;
    requestId: string;
    title: string;
    description: string;
    assigned_provider: any;
    pickup_location: string;
    delivery_location: string;
    status: 'draft' | 'pending' | 'bidding' | 'accepted' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
    is_instant: boolean;
    price: number | null;
    minimum_bid: number | null;
    bidding_end_time: string | null;
    preferred_vehicle_types: string[];
    required_qualifications: string[];
    notes: string;
    items: string;
    created_at: string;
    updated_at: string;
    time_remaining: number | null;
    bid_count: number;
    available_to_providers: boolean;
    made_available_at: string | null;
    interested_providers?: any[];
    request: {
        tracking_number: string;
        items: any[];
        user?: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            user_type: string;
            phone_number: string;
        };
        stops?: any[];
    };
}

const JobManagement: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const navigate = useNavigate();
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // instant vs bidding
    const [dateRangeFilter, setDateRangeFilter] = useState({
        startDate: '',
        endDate: '',
    });
    const [syncJobsLoading, setSyncJobsLoading] = useState(false);
    const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

    // Modal states
    const [showAssignProviderModal, setShowAssignProviderModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showCreateJobModal, setShowCreateJobModal] = useState(false);
    const [showPriceOverrideModal, setShowPriceOverrideModal] = useState(false);
    const [showBulkOverride, setShowBulkOverride] = useState(false);
    
    // Selection states
    const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);

    const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useSWR('jobs/', fetcher);

console.log("the jobs data", jobsData);

    useEffect(() => {
        if (jobsData) {
            setJobs(jobsData);
        }
    }, [jobsData]);

    useEffect(() => {
        if (jobs) {
            filterJobs();
        }
    }, [jobs, searchTerm, statusFilter, typeFilter, dateRangeFilter]);

    const filterJobs = () => {
        if (!jobs) {
            setFilteredJobs([]);
            return;
        }

        let filtered = jobs || [];

        // Apply search term filter
        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(
                (job) =>
                    job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (job.request?.user && (
                        job.request.user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        job.request.user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        job.request.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )) ||
                    job.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    job.delivery_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (job.assigned_provider && job.assigned_provider.company_name?.toLowerCase()?.includes(searchTerm.toLowerCase())) ||
                    (job.request?.tracking_number && job.request.tracking_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (job.request?.stops && job.request.stops.some((stop: any) => 
                        (stop.location?.address || stop.address || '').toLowerCase().includes(searchTerm.toLowerCase())
                    ))
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'available') {
                filtered = filtered.filter((job) => job.available_to_providers);
            } else if (statusFilter === 'unavailable') {
                filtered = filtered.filter((job) => !job.available_to_providers);
            } else {
                filtered = filtered.filter((job) => job.status === statusFilter);
            }
        }

        // Apply type filter (instant vs bidding)
        if (typeFilter !== 'all') {
            if (typeFilter === 'instant') {
                filtered = filtered.filter((job) => job.is_instant);
            } else if (typeFilter === 'bidding') {
                filtered = filtered.filter((job) => !job.is_instant);
            }
        }

        // Apply date range filter
        if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
            const startDate = new Date(dateRangeFilter.startDate);
            const endDate = new Date(dateRangeFilter.endDate);

            filtered = filtered.filter((job) => {
                const jobDate = new Date(job.created_at);
                return jobDate >= startDate && jobDate <= endDate;
            });
        }

        setFilteredJobs(filtered);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
    };

    const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTypeFilter(e.target.value);
    };

    const handleSyncJobs = async () => {
        setSyncJobsLoading(true);
        try {
            const response = await axiosInstance.post('/payments/sync_payments_with_jobs/');
            if (response.status === 200) {
                showMessage('Jobs Synced Successfully', 'success');
                mutate(`jobs/`);
            }
        } catch (error) {
            showRequestError(error);
        } finally {
            setSyncJobsLoading(false);
        }
    };

    const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRangeFilter({
            ...dateRangeFilter,
            [name]: value,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setTypeFilter('all');
        setDateRangeFilter({ startDate: '', endDate: '' });
    };

    const handleDeleteJob = async (jobId: string) => {
        try {
            const isConfirmed = await confirmDialog({
                title: 'Delete Job',
                note: 'This Action Cannot Be Undone',
                body: 'Deleing This will make it unavailable for providers to see this job',
                finalQuestion: 'Are You Sure You Want Delete This Job ',
            });
            if (isConfirmed) {
                setDeletingJobId(jobId);
                const response = await axiosInstance.delete(`/jobs/${jobId}/`);
                if (response.status === 204) {
                    showMessage('Job Deleted Successfully');
                    mutate(`jobs/`);
                }
            }
        } catch (error) {
            showRequestError(error);
        } finally {
            setDeletingJobId(null);
        }
    };

    // Modal functions
    const showAssignProvider = (job: Job) => {
        setSelectedJob(job);
        setShowAssignProviderModal(true);
    };

    const closeAssignProviderModal = () => {
        setShowAssignProviderModal(false);
        setSelectedJob(null);
    };

    const handleAssignProvider = async (jobId: string, providerId: string) => {
        try {
            // API call to assign provider to job
            const response = await fetch(`/jobs/${jobId}/assign_provider`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    providerId: providerId,
                }),
            });

            if (response.ok) {
                // Update the job in the local state
                setJobs(jobs.map((job) => (job.id === jobId ? { ...job, assignedProvider: providerId } : job)));
                showMessage('Provider assigned successfully!');
            } else {
                showMessage('Failed to assign provider', 'error');
            }
        } catch (error) {
            console.error('Error assigning provider:', error);
            throw error; // Re-throw to let the modal handle the error
        }
    };

    const handleCreateJobClick = () => {
        setShowCreateJobModal(true);
    };

    const closeCreateJobModal = () => {
        setShowCreateJobModal(false);
    };

    const handleGoToBookings = () => {
        navigate('/admin/bookings');
        setShowCreateJobModal(false);
    };

    // Selection handler
    const handleSelectionChange = (selected: Job[]) => {
        setSelectedJobs(selected);
    };

    const handlePriceOverride = () => {
        setShowPriceOverrideModal(true);
    };

    const handleStatusChange = () => {
        mutate('jobs/');
        setSelectedJobs([]);
    };

    const getStatusBadgeClass = (status: string): string => {
        switch (status) {
            case 'draft':
                return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border border-gray-200';
            case 'pending':
                return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200';
            case 'bidding':
                return 'bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border border-purple-200';
            case 'accepted':
                return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200';
            case 'assigned':
                return 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 border border-cyan-200';
            case 'in_transit':
                return 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200';
            case 'completed':
                return 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200';
            case 'cancelled':
                return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200';
            default:
                return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft':
                return <IconEdit className="w-3 h-3" />;
            case 'pending':
                return <IconClock className="w-3 h-3" />;
            case 'bidding':
                return <IconGavel className="w-3 h-3" />;
            case 'accepted':
                return <IconUserCheck className="w-3 h-3" />;
            case 'assigned':
                return <IconTarget className="w-3 h-3" />;
            case 'in_transit':
                return <IconTruck className="w-3 h-3" />;
            case 'completed':
                return <IconCheck className="w-3 h-3" />;
            case 'cancelled':
                return <IconX className="w-3 h-3" />;
            default:
                return <IconAlertCircle className="w-3 h-3" />;
        }
    };


    return (
        <div className="space-y-6">
            {/* Loading State */}
            {jobsLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading jobs...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {jobsError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <IconAlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <h3 className="text-lg font-medium text-red-900 dark:text-red-100">Error Loading Jobs</h3>
                            <p className="text-red-700 dark:text-red-300">Failed to load job data. Please try refreshing the page.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content - Only show when not loading and no error */}
            {!jobsLoading && !jobsError && (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Management</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track all job listings and assignments</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => console.log('Export jobs')}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                            >
                                <IconDownload className="w-4 h-4" />
                                Export Data
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500 rounded-xl">
                                    <IconPackage className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Jobs</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{jobs?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500 rounded-xl">
                                    <IconGavel className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Bidding</p>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{(jobs || []).filter((j) => j.status === 'bidding')?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-orange-100 dark:border-orange-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-500 rounded-xl">
                                    <IconTruck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">In Transit</p>
                                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{(jobs || []).filter((j) => j.status === 'in_transit')?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 rounded-xl">
                                    <IconCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Completed</p>
                                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{(jobs || []).filter((j) => j.status === 'completed')?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 rounded-2xl p-6 border border-cyan-100 dark:border-cyan-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-500 rounded-xl">
                                    <IconBolt className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Instant Jobs</p>
                                    <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{(jobs || []).filter((j) => j.is_instant)?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500 rounded-xl">
                                    <IconTarget className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Available Jobs</p>
                                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                                        {(jobs || []).filter((j) => j.available_to_providers)?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <IconFilter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filters & Search</h2>
                            <button
                                onClick={clearFilters}
                                className="ml-auto px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                <IconFilterOff className="w-4 h-4" />
                                Clear All
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search jobs by ID, title, customer, or location..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                                />
                            </div>

                            {/* Filter Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={handleStatusFilterChange}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="draft">Draft</option>
                                        <option value="pending">Pending</option>
                                        <option value="bidding">Bidding</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="assigned">Assigned</option>
                                        <option value="in_transit">In Transit</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="available">Available to Providers</option>
                                        <option value="unavailable">Not Available</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Type</label>
                                    <select
                                        value={typeFilter}
                                        onChange={handleTypeFilterChange}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="instant">Instant Jobs</option>
                                        <option value="bidding">Bidding Jobs</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Date</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={dateRangeFilter.startDate}
                                        onChange={handleDateRangeChange}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={dateRangeFilter.endDate}
                                        onChange={handleDateRangeChange}
                                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div className="flex items-end gap-1">  
                                    <button
                                        onClick={handleCreateJobClick}
                                        className="w-full px-1 py-2 bg-gradient-to-r btn btn-primary rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                    >
                                       <Plus className="w-4 h-4" />
                                        Create
                                    </button>
                                    <button
                                        onClick={handleSyncJobs}
                                        className="w-full px-1 py-2 bg-gradient-to-r btn btn-outline-warning  rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                    >
                                        <IconRefresh className={`w-4 h-4 ${syncJobsLoading ? 'animate-spin' : ''}`} />
                                        Sync
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Jobs Table */}
                    <DraggableDataTable
                        data={filteredJobs || []}
                        columns={[
                            {
                                accessor: 'id',
                                title: 'Job ID',
                                sortable: true,
                                width: 120,
                                render: (job: Job) => (
                                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                        #{job.id.slice(-8)}
                                    </span>
                                )
                            },
                            {
                                accessor: 'request.tracking_number',
                                title: 'Tracking',
                                sortable: true,
                                width: 140,
                                render: (job: Job) => (
                                    <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                                        {job.request?.tracking_number || 'N/A'}
                                    </span>
                                )
                            },
                            {
                                accessor: 'request.user',
                                title: 'Customer',
                                sortable: true,
                                width: 150,
                                render: (job: Job) => {
                                    const user = job.request?.user;
                                    const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
                                    const initials = user ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase() : 'U';
                                    
                                    return (
                                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                                {initials || 'U'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                                    {fullName || 'Unknown'}
                                                </span>
                                                {user?.email && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {user.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                        </div>
                                    );
                                }
                            },
                            {
                                accessor: 'is_instant',
                                title: 'Job Type',
                                sortable: true,
                                width: 120,
                                render: (job: Job) => (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${job.is_instant ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                            {job.is_instant ? <IconBolt className="w-4 h-4" />  : <IconGavel className="w-4 h-4" />}
                                                            {job.is_instant ? 'Instant' : 'Auction'}
                                                        </span>
                                )
                            },
                            {
                                accessor: 'request.stops',
                                title: 'Stops',
                                sortable: false,
                                width: 300,
                                render: (job: Job) => {
                                    const stops = job.request?.stops || [];
                                    if (!stops || stops.length === 0) {
                                        return (
                                            <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                No stops
                                            </span>
                                        );
                                    }
                                    
                                    return (
                                        <div className="space-y-1">
                                            {stops.map((stop: any, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                        index === 0 
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                                                            : index === stops.length - 1
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                    }`}>
                                                        {index + 1}
                                                        </div>
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                        <IconMapPin className={`w-3 h-3 flex-shrink-0 ${
                                                            index === 0 
                                                                ? 'text-green-500' 
                                                                : index === stops.length - 1
                                                                ? 'text-red-500'
                                                                : 'text-blue-500'
                                                        }`} />
                                                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                                            {stop.location?.address || stop.address || 'Unknown Location'}
                                                        </span>
                                                    </div>
                                                        </div>
                                            ))}
                                                                </div>
                                                            );
                                }
                            },
                            {
                                accessor: 'status',
                                title: 'Status',
                                sortable: true,
                                width: 120,
                                render: (job: Job) => (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                                                            {getStatusIcon(job.status)}
                                        {job.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                )
                            },
                            {
                                accessor: 'available_to_providers',
                                title: 'Available',
                                sortable: true,
                                width: 100,
                                render: (job: Job) => (
                                    <div className="flex items-center gap-2">
                                        {job.available_to_providers ? (
                                            <>
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                                                    Available
                                                </span>
                                                {job.made_available_at && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(job.made_available_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    Draft
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )
                            },
                            {
                                accessor: 'interested_providers_count',
                                title: 'Interested',
                                sortable: true,
                                width: 100,
                                render: (job: Job) => (
                                    <div className="flex items-center gap-2">
                                        {job.available_to_providers ? (
                                            <div className="flex items-center gap-1">
                                                <IconUsers className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {job.interested_providers.length || 0}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </div>
                                )
                            },
                            {
                                accessor: 'assigned_provider',
                                title: 'Provider',
                                sortable: true,
                                width: 150,
                                render: (job: Job) => (
                                    <div className="flex items-center gap-2">
                                                        {job.assigned_provider ? (
                                            <>
                                                <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                                    {job.assigned_provider.company_name?.charAt(0) || 'P'}
                                                            </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {job.assigned_provider.company_name || 'Unknown'}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                Unassigned
                                            </span>
                                                        )}
                                                    </div>
                                )
                            },
                            {
                                accessor: 'price',
                                title: 'Price',
                                sortable: true,
                                width: 100,
                                textAlign: 'right',
                                render: (job: Job) => (
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        £{job.price || 0}
                                    </span>
                                )
                            },
                            {
                                accessor: 'created_at',
                                title: 'Created',
                                sortable: true,
                                width: 160,
                                render: (job: Job) => (
                                    <EnterpriseDateTime
                                        date={job.created_at}
                                        showTime={true}
                                        showRelative={true}
                                        format="MMM D, YYYY"
                                        timeFormat="h:mm A"
                                        className="text-sm"
                                    />
                                )
                            },
                            {
                                accessor: 'time_remaining',
                                title: 'Time Left',
                                sortable: true,
                                width: 120,
                                render: (job: Job) => {
                                    if (!job.time_remaining) {
                                        return <span className="text-sm text-gray-400">N/A</span>;
                                    }
                                    
                                    const now = new Date();
                                    const endTime = new Date(now.getTime() + (job.time_remaining * 1000));
                                    
                                    return (
                                        <EnterpriseDateTime
                                            date={endTime}
                                            showTime={true}
                                            showRelative={true}
                                            pastDueCheck={true}
                                            status={job.status}
                                            format="MMM D"
                                            timeFormat="h:mm A"
                                            className="text-sm"
                                        />
                                    );
                                }
                            },
                            {
                                accessor: 'actions',
                                title: 'Actions',
                                sortable: false,
                                width: 120,
                                render: (job: Job) => (
                                    <div className="flex items-center gap-1">
                                        {/* View Job Details */}
                                        <button
                                            onClick={() => navigate(`/admin/jobs/${job.id}`)}
                                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        {/* Assign Provider Button */}
                                        <button
                                            onClick={() => showAssignProvider(job)}
                                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Assign Provider"
                                        >
                                            <IconUser className="w-4 h-4" />
                                        </button>

                                        {/* Delete Job Button */}
                                        <button
                                            onClick={() => handleDeleteJob(job.id)}
                                            disabled={deletingJobId === job.id}
                                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="Delete Job"
                                        >
                                            {deletingJobId === job.id ? (
                                                <IconLoader className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <IconTrash className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                )
                            }
                        ]}
                        loading={jobsLoading}
                        title="Job Management"
                        exportFileName="jobs-export"
                        storeKey="job-management-table"
                        allowSelection={true}
                        selectedRecords={selectedJobs}
                        setSelectedRecords={setSelectedJobs}
                        onSelectionChange={handleSelectionChange}
                        quickCheckFields={['id', 'request.user.first_name', 'request.user.last_name', 'request.user.email', 'request.tracking_number', 'request.stops']}
                        bulkActions={(selectedRecords) => (
                            <>
                                                    <button
                                    onClick={() => setShowBulkOverride(true)}
                                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5 text-sm"
                                >
                                    <IconTarget className="w-4 h-4" />
                                    Override Status
                                                    </button>
                                        <button
                                    onClick={handlePriceOverride}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 text-sm"
                                >
                                    <IconCurrencyDollar className="w-4 h-4" />
                                    Override Price
                                        </button>
                            </>
                        )}
                        onRefreshData={() => mutate('jobs/')}
                    />

                </>
            )}

            {/* Assign Provider Modal */}
            {showAssignProviderModal && selectedJob && (
                <AssignProviderModal
                    isOpen={showAssignProviderModal}
                    onClose={closeAssignProviderModal}
                    job={selectedJob as any}
                    onAssignProvider={handleAssignProvider}
                    getStatusBadgeClass={getStatusBadgeClass}
                    getStatusIcon={getStatusIcon}
                />
            )}

            {/* Bulk Status Override Modal */}
            {showBulkOverride && (
                <BulkStatusOverride
                    open={showBulkOverride}
                    onClose={() => setShowBulkOverride(false)}
                    onConfirm={() => {
                        console.log('Bulk status override confirmed');
                        handleStatusChange();
                        setShowBulkOverride(false);
                    }}
                    selectedJobs={selectedJobs.map(job => ({
                        id: job.id,
                        tracking_number: job.request.tracking_number,
                        status: job.status,
                        request: {
                            service_type: job.title,
                            contact_name: job.request?.user ? `${job.request.user.first_name} ${job.request.user.last_name}`.trim() : 'Unknown'
                        }
                    }))}
                />
            )}

            {/* Price Override Modal */}
            {showPriceOverrideModal && (
                <PriceOverrideModal
                    open={showPriceOverrideModal}
                    onClose={() => setShowPriceOverrideModal(false)}
                    onConfirm={() => {
                        console.log('Price override confirmed');
                        handleStatusChange();
                        setShowPriceOverrideModal(false);
                    }}
                    selectedJobs={selectedJobs.map(job => ({
                        id: job.id,
                        tracking_number: job.request.tracking_number,
                        price: job.price || 0,
                        request: {
                            service_type: job.title,
                            contact_name: job.request?.user ? `${job.request.user.first_name} ${job.request.user.last_name}`.trim() : 'Unknown',
                            base_price: job.price || 0
                        }
                    }))}
                />
            )}

            {/* Create Job Modal */}
            {showCreateJobModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                    <IconInfoCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create a New Job</h2>
                            </div>
                            <button
                                onClick={closeCreateJobModal}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <IconInfoCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">How to Create a Job</p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">
                                            Jobs are created by confirming existing bookings. This ensures all customer information, items, and requirements are properly captured.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">1</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Go to Bookings</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Navigate to the bookings page to view all pending requests</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">2</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Review Booking Details</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Check customer information, items, and service requirements</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">3</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Confirm as Job</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Convert the booking into a job for provider assignment</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Ready to create a job?</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click below to go to the bookings page and get started.</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={closeCreateJobModal}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGoToBookings}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/25 transition-colors flex items-center gap-2"
                            >
                                <IconPackage className="w-4 h-4" />
                                Go to Bookings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobManagement;
