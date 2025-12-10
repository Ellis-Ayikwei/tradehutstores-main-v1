import React, { useState, useEffect } from 'react';
import {
    IconSearch,
    IconFilter,
    IconDownload,
    IconArrowsExchange,
    IconRefresh,
    IconEye,
    IconEdit,
    IconCurrencyDollar,
    IconPercentage,
    IconReceipt,
} from '@tabler/icons-react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import useSWR, { mutate } from 'swr';
import fetcher from '../../../services/fetcher';
import showMessage from '../../../helper/showMessage';
import showRequestError from '../../../helper/showRequestError';
import showNotification from '../../../utilities/showNotifcation';
import revenueService from './services/revenueService';
import { RefundModal, StatusOverrideModal, PaymentDetailModal, ConfirmModal } from './components';
import DraggableDataTable, { type ColumnDefinition } from '../../../components/ui/DraggableDataTable';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

interface PaymentMethod {
    id: string;
    user: string;
    payment_type: 'card' | 'bank' | 'wallet';
    is_default: boolean;
    last_used: string | null;
    is_active: boolean;
    stripe_payment_method_id: string | null;
    stripe_customer_id: string | null;
    card_last_four: string | null;
    card_brand: string | null;
    card_expiry: string | null;
    card_country: string | null;
    bank_name: string | null;
    account_last_four: string | null;
    created_at: string;
    updated_at: string;
}

interface Payment {
    id: string;
    request: string;
    payment_method: string | null;
    amount: string;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
    payment_type: 'deposit' | 'full_payment' | 'final_payment' | 'additional_fee' | 'refund';
    stripe_payment_intent_id: string | null;
    stripe_charge_id: string | null;
    stripe_refund_id: string | null;
    transaction_id: string | null;
    completed_at: string | null;
    failed_at: string | null;
    refunded_at: string | null;
    description: string;
    refund_reason: string;
    failure_reason: string;
    metadata: any;
    created_at: string;
    updated_at: string;
}

interface Transaction {
    id: string;
    bookingId: string;
    customerId: string;
    customerName: string;
    providerId: string;
    providerName: string;
    type: 'payment' | 'refund' | 'payout' | 'fee';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    paymentMethod: string;
    date: string;
    description: string;
    originalPayment?: Payment;
}

interface RevenueStats {
    totalRevenue: number;
    platformFees: number;
    providerPayouts: number;
    netIncome: number;
    pendingPayments: number;
    refundsIssued: number;
    transactionCount: number;
    averageBookingValue: number;
    revenueByMonth: { [key: string]: number };
    revenueByPaymentMethod: { [key: string]: number };
}

const RevenueManagement: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState({ startDate: '', endDate: '' });
    const [timeRange, setTimeRange] = useState('6months');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showPaymentDetailModal, setShowPaymentDetailModal] = useState(false);
    const [showStatusOverrideModal, setShowStatusOverrideModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [loadingById, setLoadingById] = useState<Record<string, { poll?: boolean; delete?: boolean; retry?: boolean }>>({});
    const [bulkPolling, setBulkPolling] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);

    const { data: paymentsData, error: paymentsError, mutate: refreshPayments } = useSWR('/payments/', fetcher);
    const { data: paymentMethodsData } = useSWR('/payment-methods/', fetcher);

    useEffect(() => {
        if (paymentsData) {
            transformPaymentsToTransactions(paymentsData);
            calculateRevenueStats(paymentsData);
            setLoading(false);
        }
        if (paymentsError) {
            setError('Failed to fetch payment data');
            setLoading(false);
        }
    }, [paymentsData, paymentsError]);

    useEffect(() => {
        filterTransactions();
    }, [transactions, searchTerm, typeFilter, statusFilter, dateRangeFilter]);

    const getPaymentMethodName = (paymentMethodId: string | null): string => {
        if (!paymentMethodId || !paymentMethodsData) return 'Unknown';
        const paymentMethod = paymentMethodsData.find((pm: PaymentMethod) => pm.id === paymentMethodId);
        if (!paymentMethod) return 'Unknown';
        switch (paymentMethod.payment_type) {
            case 'card':
                return `${paymentMethod.card_brand || 'Card'} **** ${paymentMethod.card_last_four || '0000'}`;
            case 'bank':
                return `${paymentMethod.bank_name || 'Bank'} **** ${paymentMethod.account_last_four || '0000'}`;
            case 'wallet':
                return 'Digital Wallet';
            default:
                return 'Unknown';
        }
    };

    const transformPaymentsToTransactions = (payments: Payment[]) => {
        const transformedTransactions: Transaction[] = payments.map((payment) => {
            let type: 'payment' | 'refund' | 'payout' | 'fee' = 'payment';
            if (payment.payment_type === 'refund') {
                type = 'refund';
            } else if (payment.payment_type === 'additional_fee') {
                type = 'fee';
            } else if (payment.status === 'refunded' || payment.status === 'partially_refunded') {
                type = 'refund';
            }
            let status: 'completed' | 'pending' | 'failed' = 'pending';
            if (payment.status === 'completed') status = 'completed';
            else if (payment.status === 'failed' || payment.status === 'cancelled') status = 'failed';
            return {
                id: payment.id,
                bookingId: payment.request,
                customerId: payment.request,
                customerName: payment.metadata?.customer_name || 'Unknown Customer',
                providerId: payment.metadata?.provider_id || '',
                providerName: payment.metadata?.provider_name || 'Unknown Provider',
                type,
                amount: parseFloat(payment.amount),
                status,
                paymentMethod: getPaymentMethodName(payment.payment_method),
                date: payment.created_at,
                description: payment.description || `${payment.payment_type} payment`,
                originalPayment: payment,
            };
        });
        setTransactions(transformedTransactions);
    };

    const calculateRevenueStats = (payments: Payment[]) => {
        const stats: RevenueStats = {
            totalRevenue: 0,
            platformFees: 0,
            providerPayouts: 0,
            netIncome: 0,
            pendingPayments: 0,
            refundsIssued: 0,
            transactionCount: payments.length,
            averageBookingValue: 0,
            revenueByMonth: {},
            revenueByPaymentMethod: {},
        };
        payments.forEach((payment) => {
            const amount = parseFloat(payment.amount);
            const date = new Date(payment.created_at);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (payment.status === 'completed') {
                if (payment.payment_type === 'additional_fee') {
                    stats.platformFees += amount;
                } else if (payment.payment_type !== 'refund') {
                    stats.totalRevenue += amount;
                    stats.revenueByMonth[monthKey] = (stats.revenueByMonth[monthKey] || 0) + amount;
                    const methodName = getPaymentMethodName(payment.payment_method);
                    stats.revenueByPaymentMethod[methodName] = (stats.revenueByPaymentMethod[methodName] || 0) + amount;
                }
            } else if (payment.status === 'pending' || payment.status === 'processing') {
                stats.pendingPayments += amount;
            }
            if (payment.status === 'refunded' || payment.status === 'partially_refunded') {
                stats.refundsIssued += amount;
            }
        });
        stats.netIncome = stats.totalRevenue - stats.refundsIssued;
        stats.averageBookingValue = stats.totalRevenue / Math.max(1, payments.filter((p) => p.status === 'completed' && p.payment_type !== 'refund' && p.payment_type !== 'additional_fee').length);
        setRevenueStats(stats);
    };

    const filterTransactions = () => {
        let filtered = transactions;
        if (searchTerm.trim() !== '') {
            filtered = filtered.filter((transaction) =>
                transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.providerName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (typeFilter !== 'all') filtered = filtered.filter((t) => t.type === typeFilter);
        if (statusFilter !== 'all') filtered = filtered.filter((t) => t.status === statusFilter);
        if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
            const startDate = new Date(dateRangeFilter.startDate);
            const endDate = new Date(dateRangeFilter.endDate);
            filtered = filtered.filter((t) => {
                const d = new Date(t.date);
                return d >= startDate && d <= endDate;
            });
        }
        setFilteredTransactions(filtered);
        setCurrentPage(1);
    };

    const handleExportCSV = async () => {
        try {
            const headers = ['Transaction ID', 'Booking ID', 'Customer', 'Provider', 'Type', 'Amount', 'Status', 'Payment Method', 'Date'];
            const csvContent = [
                headers.join(','),
                ...filteredTransactions.map((t) => [
                    t.id,
                    t.bookingId,
                    t.customerName,
                    t.providerName,
                    t.type,
                    t.amount,
                    t.status,
                    t.paymentMethod,
                    new Date(t.date).toLocaleDateString(),
                ].join(',')),
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `revenue-transactions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            showNotification({
                message: 'Failed to export CSV. Please try again.',
                type: 'error'
            });
        }
    };

    const handleReconcilePayments = async () => {
        try {
            await revenueService.reconcilePayments();
            showMessage('Payments Reconciled successfully');
            mutate('/requests');
        } catch (error) {
            showRequestError(error);
        }
    };

    const handleRefreshData = () => {
        refreshPayments();
    };

    const handleProcessRefund = async () => {
        if (!selectedPayment || !refundAmount || !refundReason) {
            showNotification({
                message: 'Please fill in all required fields',
                type: 'warning'
            });
            return;
        }
        try {
            await revenueService.createRefund(selectedPayment.stripe_payment_intent_id!, parseFloat(refundAmount), refundReason);
            showNotification({
                message: 'Refund processed successfully',
                type: 'success'
            });
            setShowRefundModal(false);
            setRefundAmount('');
            setRefundReason('');
            setSelectedPayment(null);
            refreshPayments();
        } catch (error) {
            console.error('Failed to process refund:', error);
            showNotification({
                message: 'Failed to process refund. Please try again.',
                type: 'error'
            });
        }
    };

    const handleRetryPayment = async (payment: Payment) => {
        try {
            const retryData = {
                request_id: payment.request,
                amount: parseFloat(payment.amount),
                currency: payment.currency,
                description: `Retry payment for ${payment.request}`,
                success_url: `${window.location.origin}/admin/payments/success`,
                cancel_url: `${window.location.origin}/admin/payments/cancel`,
            };
            const response = await revenueService.createCheckoutSession(retryData);
            if (response.url) window.open(response.url, '_blank');
            else showNotification({
                message: 'Failed to create retry session',
                type: 'error'
            });
        } catch (error) {
            console.error('Failed to retry payment:', error);
            showNotification({
                message: 'Failed to retry payment. Please try again.',
                type: 'error'
            });
        }
    };

    const handleStatusOverride = async () => {
        if (!selectedPayment || !newStatus) {
            showNotification({
                message: 'Please select a status',
                type: 'warning'
            });
            return;
        }
        try {
            await revenueService.overrideStatus({
                payment_id: selectedPayment.id,
                new_status: newStatus,
                admin_notes: adminNotes,
            });
            showNotification({
                message: 'Payment status updated successfully',
                type: 'success'
            });
            setShowStatusOverrideModal(false);
            setNewStatus('');
            setAdminNotes('');
            setSelectedPayment(null);
            refreshPayments();
        } catch (error) {
            console.error('Failed to update payment status:', error);
            showNotification({
                message: 'Failed to update payment status. Please try again.',
                type: 'error'
            });
        }
    };

    const handleViewPaymentDetails = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowPaymentDetailModal(true);
    };

    const handlePollPayments = async (paymentId: string) => {
        try {
            setLoadingById((s) => ({ ...s, [paymentId]: { ...(s[paymentId] || {}), poll: true } }));
            await revenueService.pollPayment(paymentId);
            showMessage('Polled Successfully');
            mutate('/payments/');
        } catch (error) {
            showRequestError(error);
        } finally {
            setLoadingById((s) => ({ ...s, [paymentId]: { ...(s[paymentId] || {}), poll: false } }));
        }
    };

    const handleInitiateRefund = (payment: Payment) => {
        setSelectedPayment(payment);
        setRefundAmount(payment.amount);
        setShowRefundModal(true);
    };

    const handleInitiateStatusOverride = (payment: Payment) => {
        setSelectedPayment(payment);
        setNewStatus(payment.status);
        setShowStatusOverrideModal(true);
    };

    const handleBulkPoll = async (selected: Transaction[]) => {
        try {
            setBulkPolling(true);
            const ids = selected?.map((t) => t?.id).filter(Boolean) as string[];
            ids.forEach((id) => setLoadingById((s) => ({ ...s, [id]: { ...(s[id] || {}), poll: true } })));
            await Promise.all(ids.map((id) => revenueService.pollPayment(id)));
            showMessage('Polled selected payments successfully');
            mutate('/payments/');
        } catch (error) {
            showRequestError(error as any);
        } finally {
            const ids = selected?.map((t) => t?.id).filter(Boolean) as string[];
            ids.forEach((id) => setLoadingById((s) => ({ ...s, [id]: { ...(s[id] || {}), poll: false } })));
            setBulkPolling(false);
        }
    };

    const performDelete = async (ids: string[]) => {
        try {
            setBulkDeleting(true);
            ids.forEach((id) => setLoadingById((s) => ({ ...s, [id]: { ...(s[id] || {}), delete: true } })));
            await Promise.all(ids.map((id) => revenueService.deletePayment(id)));
            showNotification({ message: 'Deleted selected transactions', type: 'success' });
            mutate('/payments/');
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

    const handleBulkDelete = async (selected: Transaction[]) => {
        const ids = (selected || []).map((t) => t?.id).filter(Boolean) as string[];
        setConfirmDeleteIds(ids);
        setConfirmDeleteOpen(true);
    };

    const tableColumns: Array<ColumnDefinition> = [
        {
            accessor: 'id',
            title: 'Transaction',
            render: (transaction: Transaction) => (
                <div>
                    <div className="text-sm font-medium text-gray-900">{transaction?.id}</div>
                    <div className="text-xs text-gray-500">{transaction?.type === 'payment' || transaction?.type === 'refund' ? transaction?.customerName : transaction?.providerName}</div>
                </div>
            ),
        },
        { accessor: 'bookingId', title: 'Booking' },
        {
            accessor: 'type',
            title: 'Type',
            render: (transaction: Transaction) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeClass(transaction?.type)}`}>{transaction?.type}</span>
            ),
        },
        {
            accessor: 'amount',
            title: 'Amount',
            render: (transaction: Transaction) => (
                <span className={transaction?.type === 'refund' ? 'text-orange-600' : transaction?.type === 'payout' ? 'text-purple-600' : transaction?.type === 'payment' ? 'text-blue-600' : 'text-green-600'}>
                    {transaction?.type === 'refund' || transaction?.type === 'payout' ? '-' : ''}
                    {formatCurrency(transaction?.amount)}
                </span>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            render: (transaction: Transaction) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(transaction?.status)}`}>{transaction?.status}</span>
            ),
        },
        { accessor: 'paymentMethod', title: 'Payment Method' },
        { accessor: 'date', title: 'Date', render: (t: Transaction) => formatDate(t?.date) },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (transaction: Transaction) => (
                <div className="flex gap-2">
                    <button onClick={() => handleViewPaymentDetails(transaction?.originalPayment!)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200" title="View Details">
                        <IconEye size={14} className="mr-1" />
                        View
                    </button>
                    {transaction?.originalPayment?.status === 'pending' && (
                        <button onClick={() => handlePollPayments(transaction?.id)} disabled={!!loadingById[transaction.id]?.poll} className={`inline-flex items-center px-3 py-1.5 text-xs font-medium border rounded-md transition-colors duration-200 ${loadingById[transaction.id]?.poll ? 'bg-blue-200 text-blue-500 border-blue-200 cursor-not-allowed' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'}`} title="Poll">
                            {loadingById[transaction.id]?.poll ? (
                                <span className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1"></span>Polling...</span>
                            ) : (
                                <><IconRefresh size={14} className="mr-1" />Poll</>
                            )}
                        </button>
                    )}
                    {transaction?.originalPayment?.status === 'completed' && (
                        <button onClick={() => handleInitiateRefund(transaction?.originalPayment!)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors duration-200" title="Process Refund">
                            <IconArrowsExchange size={14} className="mr-1" />
                            Refund
                        </button>
                    )}
                    <button onClick={() => handleInitiateStatusOverride(transaction?.originalPayment!)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors duration-200" title="Override Status">
                        <IconEdit size={14} className="mr-1" />
                        Override
                    </button>
                    <button onClick={() => handleInlineDelete(transaction?.id)} disabled={!!loadingById[transaction.id]?.delete} className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 border ${loadingById[transaction.id]?.delete ? 'bg-red-300 text-white border-red-300 cursor-not-allowed' : 'text-white bg-red-600 hover:bg-red-700 border-red-700'}`} title="Delete Payment">
                        {loadingById[transaction.id]?.delete ? (
                            <span className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>Deleting...</span>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            ),
        },
    ];

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const getStatusBadgeClass = (status: string): string => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeBadgeClass = (type: string): string => {
        switch (type) {
            case 'payment':
                return 'bg-blue-100 text-blue-800';
            case 'refund':
                return 'bg-orange-100 text-orange-800';
            case 'payout':
                return 'bg-purple-100 text-purple-800';
            case 'fee':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
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

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const months = Object.keys(revenueStats?.revenueByMonth || {});
    const monthlyRevenue = Object.values(revenueStats?.revenueByMonth || {});
    const revenueChartData = {
        labels: months,
        datasets: [
            {
                label: 'Monthly Revenue',
                data: monthlyRevenue,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
            },
        ],
    };
    const paymentMethodLabels = Object.keys(revenueStats?.revenueByPaymentMethod || {});
    const paymentMethodValues = Object.values(revenueStats?.revenueByPaymentMethod || {});
    const paymentMethodChartData = {
        labels: paymentMethodLabels,
        datasets: [
            {
                label: 'Revenue by Payment Method',
                data: paymentMethodValues,
                backgroundColor: ['rgba(59, 130, 246, 0.5)', 'rgba(16, 185, 129, 0.5)', 'rgba(251, 146, 60, 0.5)'],
                borderColor: ['rgba(59, 130, 246, 1)', 'rgba(16, 185, 129, 1)', 'rgba(251, 146, 60, 1)'],
                borderWidth: 1,
            },
        ],
    };

    if (loading) {
        return (
            <div className="px-4 py-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading revenue data...</span>
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
                            <IconArrowsExchange size={20} />
                        </div>
                        <div>
                            <h3 className="text-red-800 font-medium">Error Loading Revenue Data</h3>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                            <button onClick={handleRefreshData} className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Retry</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold mb-4 md:mb-0">Revenue Management</h2>
                <div className="flex flex-col md:flex-row gap-2">
                    <select className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                        <option value="30days">Last 30 Days</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="6months">Last 6 Months</option>
                        <option value="1year">Last Year</option>
                    </select>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center" onClick={handleRefreshData}>
                        <IconRefresh size={16} className="mr-2" />
                        Refresh
                    </button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center" onClick={handleExportCSV}>
                        <IconDownload size={16} className="mr-2" />
                        Export CSV
                    </button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center" onClick={handleReconcilePayments}>
                        <IconDownload size={16} className="mr-2" />
                        Reconcile Payments
                    </button>
                </div>
            </div>

            {revenueStats && (
                <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
                                    <IconCurrencyDollar size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                                    <p className="text-2xl font-bold">{formatCurrency(revenueStats.totalRevenue)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
                                    <IconPercentage size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Platform Fees</p>
                                    <p className="text-2xl font-bold">{formatCurrency(revenueStats.platformFees)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
                                    <IconArrowsExchange size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Provider Payouts</p>
                                    <p className="text-2xl font-bold">{formatCurrency(revenueStats.providerPayouts)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-yellow-100 text-yellow-500 mr-4">
                                    <IconReceipt size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Net Income</p>
                                    <p className="text-2xl font-bold">{formatCurrency(revenueStats.netIncome)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Pending Payments</p>
                            <p className="text-xl font-bold">{formatCurrency(revenueStats.pendingPayments)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Refunds Issued</p>
                            <p className="text-xl font-bold">{formatCurrency(revenueStats.refundsIssued)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Transaction Count</p>
                            <p className="text-xl font-bold">{revenueStats.transactionCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium">Avg. Booking Value</p>
                            <p className="text-xl font-bold">{formatCurrency(revenueStats.averageBookingValue)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-semibold mb-4">Monthly Revenue</h3>
                            <div className="h-64">
                                <Bar data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' as const } }, scales: { y: { beginAtZero: true } } }} />
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="font-semibold mb-4">Revenue by Payment Method</h3>
                            <div className="h-64 flex justify-center">
                                <Pie data={paymentMethodChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' as const } } }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col space-y-3">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch size={16} className="text-gray-400" />
                            </div>
                            <input type="text" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search transactions by ID, booking, customer, or provider..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="md:w-48">
                            <div className="relative">
                                <select className="w-full p-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                    <option value="all">All Types</option>
                                    <option value="payment">Payment</option>
                                    <option value="refund">Refund</option>
                                    <option value="payout">Payout</option>
                                    <option value="fee">Fee</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <IconFilter size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                        <div className="md:w-48">
                            <div className="relative">
                                <select className="w-full p-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="md:w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                            <input type="date" name="startDate" className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={dateRangeFilter.startDate} onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, startDate: e.target.value })} />
                        </div>
                        <div className="md:w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                            <input type="date" name="endDate" className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={dateRangeFilter.endDate} onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, endDate: e.target.value })} />
                        </div>
                        <button className="px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onClick={() => setDateRangeFilter({ startDate: '', endDate: '' })}>Clear Dates</button>
                    </div>
                </div>

                <DraggableDataTable
                    data={filteredTransactions}
                    columns={tableColumns}
                    loading={loading}
                    title="Transactions"
                    onRefreshData={handleRefreshData}
                    allowSelection={true}
                    bulkActions={(selected) => (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkPoll(selected as Transaction[])}
                                disabled={bulkPolling}
                                className={`btn btn-sm border ${bulkPolling ? 'bg-blue-200 text-blue-600 border-blue-200 cursor-not-allowed' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                            >
                                {bulkPolling ? 'Polling...' : 'Poll Selected'}
                            </button>
                            <button
                                onClick={() => handleBulkDelete(selected as Transaction[])}
                                disabled={bulkDeleting}
                                className={`btn btn-sm border ${bulkDeleting ? 'bg-red-200 text-red-700 border-red-200 cursor-not-allowed' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                            >
                                {bulkDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    )}
                    storeKey="revenue-transactions"
                />
            </div>

            {showRefundModal && selectedPayment && (
                <RefundModal
                    selectedPayment={selectedPayment}
                    refundAmount={refundAmount}
                    refundReason={refundReason}
                    onClose={() => setShowRefundModal(false)}
                    onAmountChange={setRefundAmount}
                    onReasonChange={setRefundReason}
                    onSubmit={handleProcessRefund}
                    formatCurrency={formatCurrency}
                />
            )}

            {showStatusOverrideModal && selectedPayment && (
                <StatusOverrideModal
                    isOpen={showStatusOverrideModal}
                    selectedPayment={selectedPayment}
                    newStatus={newStatus}
                    adminNotes={adminNotes}
                    onClose={() => setShowStatusOverrideModal(false)}
                    onStatusChange={setNewStatus}
                    onNotesChange={setAdminNotes}
                    onSubmit={handleStatusOverride}
                />
            )}

            {showPaymentDetailModal && selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setShowPaymentDetailModal(false)}
                    onPoll={handlePollPayments}
                    onRefund={handleInitiateRefund}
                    onOverride={handleInitiateStatusOverride}
                    onRetry={handleRetryPayment}
                    isPolling={!!loadingById[selectedPayment.id]?.poll}
                    isRetrying={!!loadingById[selectedPayment.id]?.retry}
                    isDeleting={!!loadingById[selectedPayment.id]?.delete}
                    onDelete={handleInlineDelete}
                    formatCurrency={formatCurrency}
                />
            )}

            {confirmDeleteOpen && (
                <ConfirmModal
                    title="Delete Payment"
                    message={confirmDeleteIds.length > 1 ? `Are you sure you want to delete ${confirmDeleteIds.length} payments? This action cannot be undone.` : 'Are you sure you want to delete this payment? This action cannot be undone.'}
                    confirmText={confirmDeleteIds.length > 1 ? 'Delete Payments' : 'Delete Payment'}
                    cancelText="Cancel"
                    loading={bulkDeleting}
                    onCancel={() => { setConfirmDeleteOpen(false); setConfirmDeleteIds([]); }}
                    onConfirm={() => performDelete(confirmDeleteIds)}
                />
            )}
        </div>
    );
};

export default RevenueManagement;


