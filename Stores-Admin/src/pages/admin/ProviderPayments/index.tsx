import React, { useState, useEffect } from 'react';
import {
    IconSearch,
    IconFilter,
    IconDownload,
    IconRefresh,
    IconEdit,
    IconPlus,
    IconCreditCard,
    IconCheck,
    IconX,
    IconClock,
    IconArrowRight,
    IconLoader,
} from '@tabler/icons-react';
import useSWR, { mutate } from 'swr';
import fetcher from '../../../services/fetcher';
import showMessage from '../../../helper/showMessage';
import showRequestError from '../../../helper/showRequestError';
import showNotification from '../../../utilities/showNotifcation';
import providerPaymentService from './services/providerPaymentService';
import CreatePaymentModal from './components/CreatePaymentModal';
import UpdatePaymentModal from './components/UpdatePaymentModal';
import DraggableDataTable, { type ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import { ConfirmModal } from '../../admin/RevenueManagement/components';

interface Provider {
    id: string;
    company_name: string;
    user?: {
        email: string;
        first_name: string;
        last_name: string;
    };
}

interface Job {
    id: string;
    job_number: string;
    title: string;
    status: string;
}

interface ProviderPayment {
    id: string;
    provider: string | Provider;
    provider_id?: string;
    provider_company_name?: string;
    job?: string | Job | null;
    job_id?: string;
    job_number?: string;
    job_title?: string;
    transaction_id: string;
    amount: string;
    payment_type: 'payout' | 'refund' | 'fee';
    status: 'pending' | 'completed' | 'failed';
    notes?: string;
    created_at: string;
    completed_at?: string | null;
}

interface PaymentStats {
    total_paid: number;
    pending_amount: number;
    failed_amount: number;
    payout_count: number;
    refund_count: number;
    fee_count: number;
    job_related_count: number;
    standalone_count: number;
}

const ProviderPayments: React.FC = () => {
    const [payments, setPayments] = useState<ProviderPayment[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<ProviderPayment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState({ startDate: '', endDate: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<PaymentStats | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<ProviderPayment | null>(null);
    const [loadingById, setLoadingById] = useState<Record<string, { delete?: boolean }>>({});
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [creatingPayments, setCreatingPayments] = useState(false);
    const [initiatingPayment, setInitiatingPayment] = useState<Record<string, boolean>>({});

    // Fetch data
    const { data: paymentsData, error: paymentsError, mutate: refreshPayments } = useSWR('/provider-payments/', fetcher);
    const { data: providersData } = useSWR('/providers/', fetcher);
    const { data: jobsData } = useSWR('/jobs/', fetcher);
    const { data: summaryData } = useSWR('/provider-payments/summary/', fetcher);

    const providers: Provider[] = providersData || [];
    const jobs: Job[] = jobsData || [];

    useEffect(() => {
        if (paymentsData) {
            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
            setLoading(false);
        }
        if (paymentsError) {
            setError('Failed to fetch provider payments');
            setLoading(false);
        }
    }, [paymentsData, paymentsError]);

    useEffect(() => {
        if (summaryData) {
            setStats(summaryData);
        }
    }, [summaryData]);

    useEffect(() => {
        filterPayments();
    }, [payments, searchTerm, providerFilter, statusFilter, typeFilter, dateRangeFilter]);

    const filterPayments = () => {
        let filtered = payments;

        // Search filter
        if (searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter((payment) =>
                payment.transaction_id.toLowerCase().includes(searchLower) ||
                payment.provider_company_name?.toLowerCase().includes(searchLower) ||
                payment.job_number?.toLowerCase().includes(searchLower) ||
                payment.job_title?.toLowerCase().includes(searchLower)
            );
        }

        // Provider filter
        if (providerFilter) {
            const providerId = typeof filtered[0]?.provider === 'string' 
                ? providerFilter 
                : (filtered.find(p => {
                    const pId = typeof p.provider === 'string' ? p.provider : (p.provider as Provider)?.id || p.provider_id;
                    return pId === providerFilter;
                }) ? providerFilter : '');
            
            filtered = filtered.filter((payment) => {
                const paymentProviderId = typeof payment.provider === 'string' 
                    ? payment.provider 
                    : (payment.provider as Provider)?.id || payment.provider_id || '';
                return paymentProviderId === providerFilter;
            });
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((p) => p.status === statusFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter((p) => p.payment_type === typeFilter);
        }

        // Date range filter
        if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
            const startDate = new Date(dateRangeFilter.startDate);
            const endDate = new Date(dateRangeFilter.endDate);
            filtered = filtered.filter((p) => {
                const paymentDate = new Date(p.created_at);
                return paymentDate >= startDate && paymentDate <= endDate;
            });
        }

        setFilteredPayments(filtered);
    };

    const handleCreatePayment = async (data: {
        provider: string;
        job?: string | null;
        amount: string;
        payment_type: 'payout' | 'refund' | 'fee';
        status: 'pending' | 'completed' | 'failed';
        transaction_id?: string;
        notes?: string;
    }) => {
        try {
            await providerPaymentService.createPayment(data);
            showNotification({
                message: 'Payment created successfully',
                type: 'success',
            });
            refreshPayments();
            mutate('/provider-payments/summary/');
        } catch (error: any) {
            showRequestError(error);
            throw error;
        }
    };

    const handleUpdatePayment = async (paymentId: string, data: {
        provider?: string;
        job?: string | null;
        amount?: string;
        payment_type?: 'payout' | 'refund' | 'fee';
        status?: 'pending' | 'completed' | 'failed';
        transaction_id?: string;
        notes?: string;
    }) => {
        try {
            await providerPaymentService.updatePayment(paymentId, data);
            showNotification({
                message: 'Payment updated successfully',
                type: 'success',
            });
            refreshPayments();
            mutate('/provider-payments/summary/');
        } catch (error: any) {
            showRequestError(error);
            throw error;
        }
    };

    const performDelete = async (ids: string[]) => {
        try {
            setBulkDeleting(true);
            ids.forEach((id) => setLoadingById((s) => ({ ...s, [id]: { ...(s[id] || {}), delete: true } })));
            await Promise.all(ids.map((id) => providerPaymentService.deletePayment(id)));
            showNotification({ message: 'Deleted selected payments', type: 'success' });
            refreshPayments();
            mutate('/provider-payments/summary/');
        } catch (error) {
            showRequestError(error as any);
        } finally {
            ids.forEach((id) => setLoadingById((s) => ({ ...s, [id]: { ...(s[id] || {}), delete: false } })));
            setBulkDeleting(false);
            setConfirmDeleteOpen(false);
            setConfirmDeleteIds([]);
        }
    };

    const handleInlineDelete = async (paymentId: string) => {
        setConfirmDeleteIds([paymentId]);
        setConfirmDeleteOpen(true);
    };

    const handleBulkDelete = async (selected: ProviderPayment[]) => {
        const ids = (selected || []).map((p) => p.id).filter(Boolean) as string[];
        setConfirmDeleteIds(ids);
        setConfirmDeleteOpen(true);
    };

    const handleEditPayment = (payment: ProviderPayment) => {
        setSelectedPayment(payment);
        setShowUpdateModal(true);
    };

    const handleCreatePaymentsForCompletedJobs = async () => {
        if (!window.confirm('This will create payments for all completed jobs that don\'t have payments yet. Continue?')) {
            return;
        }

        setCreatingPayments(true);
        try {
            const result = await providerPaymentService.createPaymentsForCompletedJobs();
            showNotification({
                message: result.message || `Created ${result.created_count || 0} payments`,
                type: 'success',
            });
            refreshPayments();
            mutate('/provider-payments/summary/');
            
            // Show detailed results if available
            if (result.created_count > 0 || result.skipped_count > 0 || result.error_count > 0) {
                const details = [
                    result.created_count > 0 ? `Created: ${result.created_count}` : '',
                    result.skipped_count > 0 ? `Skipped: ${result.skipped_count}` : '',
                    result.error_count > 0 ? `Errors: ${result.error_count}` : '',
                ].filter(Boolean).join(', ');
            }
        } catch (error: any) {
            showRequestError(error);
        } finally {
            setCreatingPayments(false);
        }
    };

    const handleInitiatePayment = async (paymentId: string) => {
        if (!window.confirm('Initiate payment processing for this provider? This will call the payment service.')) {
            return;
        }

        setInitiatingPayment((prev) => ({ ...prev, [paymentId]: true }));
        try {
            const result = await providerPaymentService.initiatePayment(paymentId);
            showNotification({
                message: result.message || 'Payment initiation requested',
                type: 'success',
            });
            refreshPayments();
        } catch (error: any) {
            showRequestError(error);
        } finally {
            setInitiatingPayment((prev) => ({ ...prev, [paymentId]: false }));
        }
    };

    const formatCurrency = (amount: number | string): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2,
        }).format(numAmount);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusBadgeClass = (status: string): string => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const getTypeBadgeClass = (type: string): string => {
        switch (type) {
            case 'payout':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'refund':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'fee':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const tableColumns: Array<ColumnDefinition> = [
        {
            accessor: 'transaction_id',
            title: 'Transaction ID',
            render: (payment: ProviderPayment) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {payment.transaction_id}
                    </div>
                    <div className="text-xs text-gray-500">
                        {formatDate(payment.created_at)}
                    </div>
                </div>
            ),
        },
        {
            accessor: 'provider_company_name',
            title: 'Provider',
            render: (payment: ProviderPayment) => (
                <div className="text-sm text-gray-900 dark:text-white">
                    {payment.provider_company_name || 'Unknown Provider'}
                </div>
            ),
        },
        {
            accessor: 'job_number',
            title: 'Job',
            render: (payment: ProviderPayment) => (
                <div>
                    {payment.job_number ? (
                        <>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {payment.job_number}
                            </div>
                            {payment.job_title && (
                                <div className="text-xs text-gray-500">{payment.job_title}</div>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Standalone</span>
                    )}
                </div>
            ),
        },
        {
            accessor: 'payment_type',
            title: 'Type',
            render: (payment: ProviderPayment) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeClass(payment.payment_type)}`}>
                    {payment.payment_type}
                </span>
            ),
        },
        {
            accessor: 'amount',
            title: 'Amount',
            render: (payment: ProviderPayment) => (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount)}
                </span>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            render: (payment: ProviderPayment) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(payment.status)}`}>
                    {payment.status}
                </span>
            ),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (payment: ProviderPayment) => (
                <div className="flex gap-2">
                    {payment.status === 'pending' && (
                        <button
                            onClick={() => handleInitiatePayment(payment.id)}
                            disabled={!!initiatingPayment[payment.id]}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 border ${
                                initiatingPayment[payment.id]
                                    ? 'bg-green-300 text-white border-green-300 cursor-not-allowed'
                                    : 'text-white bg-green-600 hover:bg-green-700 border-green-700'
                            }`}
                            title="Initiate Payment"
                        >
                            {initiatingPayment[payment.id] ? (
                                <span className="flex items-center">
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
                                    Initiating...
                                </span>
                            ) : (
                                <>
                                    <IconArrowRight size={14} className="mr-1" />
                                    Initiate
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => handleEditPayment(payment)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200"
                        title="Edit Payment"
                    >
                        <IconEdit size={14} className="mr-1" />
                        Edit
                    </button>
                    <button
                        onClick={() => handleInlineDelete(payment.id)}
                        disabled={!!loadingById[payment.id]?.delete}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 border ${
                            loadingById[payment.id]?.delete
                                ? 'bg-red-300 text-white border-red-300 cursor-not-allowed'
                                : 'text-white bg-red-600 hover:bg-red-700 border-red-700'
                        }`}
                        title="Delete Payment"
                    >
                        {loadingById[payment.id]?.delete ? (
                            <span className="flex items-center">
                                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>
                                Deleting...
                            </span>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            ),
        },
    ];

    const handleExportCSV = () => {
        try {
            const headers = ['Transaction ID', 'Provider', 'Job', 'Type', 'Amount', 'Status', 'Created At'];
            const csvContent = [
                headers.join(','),
                ...filteredPayments.map((p) =>
                    [
                        p.transaction_id,
                        p.provider_company_name || 'Unknown',
                        p.job_number || 'Standalone',
                        p.payment_type,
                        p.amount,
                        p.status,
                        formatDate(p.created_at),
                    ].join(',')
                ),
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `provider-payments-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            showNotification({
                message: 'Failed to export CSV. Please try again.',
                type: 'error',
            });
        }
    };

    if (loading) {
        return (
            <div className="px-4 py-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading provider payments...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 py-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="text-red-600 mr-3">
                            <IconX size={20} />
                        </div>
                        <div>
                            <h3 className="text-red-800 font-medium">Error Loading Payments</h3>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                            <button
                                onClick={() => refreshPayments()}
                                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Provider Payments</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage payments and payouts to service providers
                    </p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
                    <button
                        className="border border-gray-700 dark:border-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                        onClick={() => refreshPayments()}
                    >
                        <IconRefresh size={16} className="mr-2" />
                        Refresh
                    </button>
                    <button
                        className="border border-gray-700 dark:border-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                        onClick={handleExportCSV}
                    >
                        <IconDownload size={16} className="mr-2" />
                        Export CSV
                    </button>
                    <button
                        className="border border-gray-700 dark:border-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <IconPlus size={16} className="mr-2" />
                        Create Payment
                    </button>
                    <button
                        className="border border-gray-700 dark:border-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        onClick={handleCreatePaymentsForCompletedJobs}
                        disabled={creatingPayments}
                        title="Create payments for all completed jobs that don't have payments yet"
                    >
                        {creatingPayments ? (
                            <>
                                <IconLoader size={16} className="mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <IconArrowRight size={16} className="mr-2" />
                                Create Payments for Completed Jobs
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-500 mr-4">
                                    <IconCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Paid</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(stats.total_paid)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-500 mr-4">
                                    <IconClock size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(stats.pending_amount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 text-red-500 mr-4">
                                    <IconX size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Failed</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(stats.failed_amount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 mr-4">
                                    <IconCreditCard size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Payouts</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.payout_count}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Table */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col space-y-3">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch size={16} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Search by transaction ID, provider, or job..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="md:w-48">
                            <div className="relative">
                                <select
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    value={providerFilter}
                                    onChange={(e) => setProviderFilter(e.target.value)}
                                >
                                    <option value="">All Providers</option>
                                    {providers.map((provider) => (
                                        <option key={provider.id} value={provider.id}>
                                            {provider.company_name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <IconFilter size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                        <div className="md:w-48">
                            <div className="relative">
                                <select
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <IconFilter size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                        <div className="md:w-48">
                            <div className="relative">
                                <select
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="payout">Payout</option>
                                    <option value="refund">Refund</option>
                                    <option value="fee">Fee</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <IconFilter size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="md:w-48">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                value={dateRangeFilter.startDate}
                                onChange={(e) =>
                                    setDateRangeFilter({ ...dateRangeFilter, startDate: e.target.value })
                                }
                            />
                        </div>
                        <div className="md:w-48">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                To Date
                            </label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                value={dateRangeFilter.endDate}
                                onChange={(e) =>
                                    setDateRangeFilter({ ...dateRangeFilter, endDate: e.target.value })
                                }
                            />
                        </div>
                        <button
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                            onClick={() => setDateRangeFilter({ startDate: '', endDate: '' })}
                        >
                            Clear Dates
                        </button>
                    </div>
                </div>

                <DraggableDataTable
                    data={filteredPayments}
                    columns={tableColumns}
                    loading={loading}
                    title="Provider Payments"
                    onRefreshData={() => refreshPayments()}
                    allowSelection={true}
                    bulkActions={(selected) => (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkDelete(selected as ProviderPayment[])}
                                disabled={bulkDeleting}
                                className={`btn btn-sm border ${
                                    bulkDeleting
                                        ? 'bg-red-200 text-red-700 border-red-200 cursor-not-allowed'
                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                            >
                                {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                            </button>
                        </div>
                    )}
                    storeKey="provider-payments"
                />
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreatePaymentModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreatePayment}
                    providers={providers}
                    jobs={jobs}
                    formatCurrency={formatCurrency}
                />
            )}

            {showUpdateModal && selectedPayment && (
                <UpdatePaymentModal
                    isOpen={showUpdateModal}
                    onClose={() => {
                        setShowUpdateModal(false);
                        setSelectedPayment(null);
                    }}
                    payment={selectedPayment}
                    onSubmit={handleUpdatePayment}
                    providers={providers}
                    jobs={jobs}
                    formatCurrency={formatCurrency}
                />
            )}

            {confirmDeleteOpen && (
                <ConfirmModal
                    title="Delete Payment"
                    message={
                        confirmDeleteIds.length > 1
                            ? `Are you sure you want to delete ${confirmDeleteIds.length} payments? This action cannot be undone.`
                            : 'Are you sure you want to delete this payment? This action cannot be undone.'
                    }
                    confirmText={confirmDeleteIds.length > 1 ? 'Delete Payments' : 'Delete Payment'}
                    cancelText="Cancel"
                    loading={bulkDeleting}
                    onCancel={() => {
                        setConfirmDeleteOpen(false);
                        setConfirmDeleteIds([]);
                    }}
                    onConfirm={() => performDelete(confirmDeleteIds)}
                />
            )}
        </div>
    );
};

export default ProviderPayments;

