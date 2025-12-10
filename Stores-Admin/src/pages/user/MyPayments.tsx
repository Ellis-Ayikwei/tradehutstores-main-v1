import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    IconCreditCard,
    IconWallet,
    IconReceipt,
    IconDownload,
    IconSearch,
    IconFilter,
    IconPlus,
    IconX,
    IconCheck,
    IconClock,
    IconAlertCircle,
    IconArrowRight,
    IconCalendar,
    IconChevronDown,
    IconChevronUp,
    IconEye,
    IconRefresh,
    IconTrendingUp,
    IconTrendingDown,
    IconDots,
    IconCurrency,
    IconFileInvoice,
    IconShieldCheck,
    IconExternalLink,
} from '@tabler/icons-react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import paymentService, { Payment } from '../../services/paymentService';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';

interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
    };
}

interface PaymentStats {
    totalPaid: number;
    totalPending: number;
    totalRefunded: number;
    monthlySpending: number;
    transactionCount: number;
    averageAmount: number;
}

const MyPayments: React.FC = () => {
    const navigate = useNavigate();
    const authUser = useAuthUser() as AuthUser | null;
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('all');
    const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
    const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    // Fetch payments data
    const {
        data: payments,
        error: paymentsError,
        mutate: refreshPayments,
    } = useSWR(authUser ? '/payments/' : null, fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: true,
    });


    // Filter and process payments
    const processedPayments = React.useMemo(() => {
        // Handle different API response formats
        let paymentsArray: Payment[] = [];

        if (!payments) {
            return [];
        }

        // If payments is an array, use it directly
        if (Array.isArray(payments)) {
            paymentsArray = payments;
        }
        // If payments is an object with results property (paginated response)
        else if (payments && typeof payments === 'object' && Array.isArray(payments.results)) {
            paymentsArray = payments.results;
        }
        // If payments is an object with data property
        else if (payments && typeof payments === 'object' && Array.isArray(payments.data)) {
            paymentsArray = payments.data;
        }
        // Otherwise, try to extract payments array from object
        else if (payments && typeof payments === 'object') {
            // Look for any array property in the response
            const possibleArrays = Object.values(payments).filter(Array.isArray);
            if (possibleArrays.length > 0) {
                paymentsArray = possibleArrays[0] as Payment[];
            }
        }

        return paymentsArray.filter((payment: Payment) => {
            const matchesSearch =
                payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.request.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;

            const matchesDate = (() => {
                if (dateRange === 'all') return true;
                const paymentDate = new Date(payment.created_at);
                const now = new Date();

                switch (dateRange) {
                    case 'week':
                        return now.getTime() - paymentDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
                    case 'month':
                        return now.getTime() - paymentDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
                    case 'year':
                        return now.getTime() - paymentDate.getTime() <= 365 * 24 * 60 * 60 * 1000;
                    default:
                        return true;
                }
            })();

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [payments, searchQuery, filterStatus, dateRange]);

    // Calculate payment statistics
    const paymentStats = React.useMemo(() => {
        // Handle different API response formats
        let paymentsArray: Payment[] = [];

        if (!payments) {
            return {
                totalPaid: 0,
                totalPending: 0,
                totalRefunded: 0,
                monthlySpending: 0,
                transactionCount: 0,
                averageAmount: 0,
            };
        }

        // Extract payments array using the same logic as processedPayments
        if (Array.isArray(payments)) {
            paymentsArray = payments;
        } else if (payments && typeof payments === 'object' && Array.isArray(payments.results)) {
            paymentsArray = payments.results;
        } else if (payments && typeof payments === 'object' && Array.isArray(payments.data)) {
            paymentsArray = payments.data;
        } else if (payments && typeof payments === 'object') {
            const possibleArrays = Object.values(payments).filter(Array.isArray);
            if (possibleArrays.length > 0) {
                paymentsArray = possibleArrays[0] as Payment[];
            }
        }

        const stats = paymentsArray.reduce(
            (acc: PaymentStats, payment: Payment) => {
                // Ensure amount is a number
                const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;

                // Skip if amount is not a valid number
                if (isNaN(amount) || amount < 0) {
                    console.warn('Invalid payment amount:', payment.amount, 'for payment:', payment.id);
                    return acc;
                }

                switch (payment.status) {
                    case 'completed':
                        acc.totalPaid += amount;
                        break;
                    case 'pending':
                        acc.totalPending += amount;
                        break;
                    case 'refunded':
                    case 'partially_refunded':
                        acc.totalRefunded += amount;
                        break;
                }

                // Monthly spending (last 30 days)
                const paymentDate = new Date(payment.created_at);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                if (paymentDate >= thirtyDaysAgo && payment.status === 'completed') {
                    acc.monthlySpending += amount;
                }

                acc.transactionCount++;
                return acc;
            },
            {
                totalPaid: 0,
                totalPending: 0,
                totalRefunded: 0,
                monthlySpending: 0,
                transactionCount: 0,
                averageAmount: 0,
            }
        );

        // Fix division by zero for average amount
        const completedPayments = paymentsArray.filter((p: Payment) => p.status === 'completed');
        stats.averageAmount = completedPayments.length > 0 ? stats.totalPaid / completedPayments.length : 0;

        // Ensure all values are valid numbers
        stats.totalPaid = isNaN(stats.totalPaid) ? 0 : stats.totalPaid;
        stats.totalPending = isNaN(stats.totalPending) ? 0 : stats.totalPending;
        stats.totalRefunded = isNaN(stats.totalRefunded) ? 0 : stats.totalRefunded;
        stats.monthlySpending = isNaN(stats.monthlySpending) ? 0 : stats.monthlySpending;
        stats.averageAmount = isNaN(stats.averageAmount) ? 0 : stats.averageAmount;

        return stats;
    }, [payments]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'refunded':
            case 'partially_refunded':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'processing':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <IconCheck className="w-4 h-4" />;
            case 'pending':
                return <IconClock className="w-4 h-4" />;
            case 'failed':
                return <IconX className="w-4 h-4" />;
            case 'refunded':
            case 'partially_refunded':
                return <IconRefresh className="w-4 h-4" />;
            case 'processing':
                return <IconClock className="w-4 h-4 animate-spin" />;
            default:
                return <IconAlertCircle className="w-4 h-4" />;
        }
    };

    const formatAmount = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    // Helper function to safely convert amount to number and format it
    const safeFormatAmount = (amount: number | string, currency: string = 'USD') => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numericAmount)) {
            console.warn('Invalid amount for formatting:', amount);
            return '$0.00';
        }
        return formatAmount(numericAmount, currency);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handlePaymentClick = (payment: Payment) => {
        // Clear any download errors when toggling payment details
        setDownloadError(null);

        if (expandedPayment === payment.id) {
            setExpandedPayment(null);
        } else {
            setExpandedPayment(payment.id);
        }
    };

    const handleViewBooking = (requestId: string) => {
        navigate(`/bookings/${requestId}`);
    };

    const handleDownloadInvoice = async (paymentId: string) => {
        try {
            setDownloadingInvoice(paymentId);
            setDownloadError(null);
            await paymentService.downloadInvoice(paymentId);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            setDownloadError(error instanceof Error ? error.message : 'Failed to download invoice');
        } finally {
            setDownloadingInvoice(null);
        }
    };

    const handleDownloadReceipt = async (paymentId: string) => {
        try {
            setDownloadingReceipt(paymentId);
            setDownloadError(null);
            await paymentService.downloadReceipt(paymentId);
        } catch (error) {
            console.error('Error downloading receipt:', error);
            setDownloadError(error instanceof Error ? error.message : 'Failed to download receipt');
        } finally {
            setDownloadingReceipt(null);
        }
    };

    const handlePreviewInvoice = async (paymentId: string) => {
        try {
            const invoiceUrl = await paymentService.getInvoiceUrl(paymentId);
            window.open(invoiceUrl, '_blank');
        } catch (error) {
            console.error('Error opening invoice:', error);
            setDownloadError('Failed to open invoice preview');
        }
    };

    if (!authUser) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Please Login</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">You need to be logged in to view your payments.</p>
                    <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💳 My Payments</h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your payment history and track transactions</p>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center space-x-3">
                            <button
                                onClick={refreshPayments}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                <IconRefresh className="w-4 h-4 mr-2" />
                                Refresh
                            </button>
                            <button onClick={() => setShowFilters(!showFilters)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <IconFilter className="w-4 h-4 mr-2" />
                                Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeFormatAmount(paymentStats.totalPaid)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                <IconTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeFormatAmount(paymentStats.totalPending)}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                                <IconClock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Spending</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeFormatAmount(paymentStats.monthlySpending)}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <IconCalendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{paymentStats.transactionCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <IconReceipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
                                    <div className="relative">
                                        <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search payments..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="completed">Completed</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                        <option value="processing">Processing</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                                    <select
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="week">Last Week</option>
                                        <option value="month">Last Month</option>
                                        <option value="year">Last Year</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Payments List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{processedPayments.length} transactions found</p>
                    </div>

                    {paymentsError ? (
                        <div className="p-8 text-center">
                            <IconAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Payments</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">There was an error loading your payment history.</p>
                            <button onClick={refreshPayments} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                Try Again
                            </button>
                        </div>
                    ) : !payments ? (
                        <div className="p-8">
                            <div className="animate-pulse space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                        </div>
                                        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : payments && !Array.isArray(payments) && (!payments.results || !Array.isArray(payments.results)) && (!payments.data || !Array.isArray(payments.data)) ? (
                        <div className="p-8 text-center">
                            <IconAlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unexpected Data Format</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">The payment data format is not recognized. Please contact support if this persists.</p>
                            <details className="text-left bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                                <summary className="cursor-pointer font-medium">Debug Information</summary>
                                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(payments, null, 2)}</pre>
                            </details>
                            <button onClick={refreshPayments} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                Try Again
                            </button>
                        </div>
                    ) : processedPayments.length === 0 ? (
                        <div className="p-8 text-center">
                            <IconWallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Payments Found</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {searchQuery || filterStatus !== 'all' || dateRange !== 'all' ? 'Try adjusting your filters' : "You haven't made any payments yet"}
                            </p>
                            {searchQuery || filterStatus !== 'all' || dateRange !== 'all' ? (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterStatus('all');
                                        setDateRange('all');
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Clear Filters
                                </button>
                            ) : (
                                <button onClick={() => navigate('/service-request')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                    Create Booking
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {processedPayments.map((payment: Payment, index: number) => (
                                <motion.div
                                    key={payment.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                >
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => handlePaymentClick(payment)}>
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                                <IconCreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{payment.description}</h3>
                                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <span>#{payment.id}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(payment.created_at)}</span>
                                                    <span>•</span>
                                                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                                        {getStatusIcon(payment.status)}
                                                        <span className="capitalize">{payment.status.replace('_', ' ')}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{safeFormatAmount(payment.amount, payment.currency)}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{payment.payment_type?.replace('_', ' ')}</p>
                                            </div>
                                            {expandedPayment === payment.id ? <IconChevronUp className="w-5 h-5 text-gray-400" /> : <IconChevronDown className="w-5 h-5 text-gray-400" />}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedPayment === payment.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Payment Details</h4>
                                                        <dl className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-600 dark:text-gray-400">Transaction ID</dt>
                                                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{payment.transaction_id || payment.id}</dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-600 dark:text-gray-400">Amount</dt>
                                                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{safeFormatAmount(payment.amount, payment.currency)}</dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-600 dark:text-gray-400">Currency</dt>
                                                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{payment.currency.toUpperCase()}</dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt className="text-sm text-gray-600 dark:text-gray-400">Payment Type</dt>
                                                                <dd className="text-sm font-medium text-gray-900 dark:text-white">{payment.payment_type?.replace('_', ' ') || 'Standard'}</dd>
                                                            </div>
                                                            {payment.completed_at && (
                                                                <div className="flex justify-between">
                                                                    <dt className="text-sm text-gray-600 dark:text-gray-400">Completed</dt>
                                                                    <dd className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(payment.completed_at)}</dd>
                                                                </div>
                                                            )}
                                                        </dl>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Actions</h4>

                                                        {/* Error message */}
                                                        {downloadError && (
                                                            <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                                                <div className="flex items-center">
                                                                    <IconAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                                                                    <span className="text-sm text-red-800 dark:text-red-200">{downloadError}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-2">
                                                            <button
                                                                onClick={() => handleViewBooking(payment.request)}
                                                                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                                            >
                                                                <IconEye className="w-4 h-4 mr-2" />
                                                                View Booking
                                                            </button>

                                                            {payment.status === 'completed' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleDownloadInvoice(payment.id)}
                                                                        disabled={downloadingInvoice === payment.id}
                                                                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        {downloadingInvoice === payment.id ? (
                                                                            <>
                                                                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                                Downloading...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <IconDownload className="w-4 h-4 mr-2" />
                                                                                Download Invoice
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleDownloadReceipt(payment.id)}
                                                                        disabled={downloadingReceipt === payment.id}
                                                                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        {downloadingReceipt === payment.id ? (
                                                                            <>
                                                                                <div className="w-4 h-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                                                                                Downloading...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <IconReceipt className="w-4 h-4 mr-2" />
                                                                                Download Receipt
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handlePreviewInvoice(payment.id)}
                                                                        className="w-full flex items-center justify-center px-4 py-2 border border-green-300 dark:border-green-600 rounded-lg text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                                    >
                                                                        <IconEye className="w-4 h-4 mr-2" />
                                                                        Preview Invoice
                                                                    </button>
                                                                </>
                                                            )}

                                                            {payment.status === 'pending' && (
                                                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                                                    <div className="flex items-center">
                                                                        <IconClock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                                                                        <span className="text-sm text-yellow-800 dark:text-yellow-200">Payment is being processed</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {payment.status === 'failed' && (
                                                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                                                    <div className="flex items-center">
                                                                        <IconAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                                                                        <span className="text-sm text-red-800 dark:text-red-200">Payment failed - please try again</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Security Notice */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
                >
                    <div className="flex items-start space-x-3">
                        <IconShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Secure Payments</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">All payments are processed securely through Stripe. Your payment information is encrypted and protected.</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default MyPayments;
