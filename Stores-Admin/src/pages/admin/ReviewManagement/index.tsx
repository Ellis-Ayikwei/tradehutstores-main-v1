import React, { useState, useEffect, useMemo } from 'react';
import { 
    IconSearch, 
    IconFilter, 
    IconFilterOff, 
    IconPlus, 
    IconEdit, 
    IconTrash, 
    IconEye,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDownload,
    IconCheck,
    IconAlertCircle
} from '@tabler/icons-react';
import useSWR, { mutate } from 'swr';
import axiosInstance from '../../../services/axiosInstance';
import fetcher from '../../../services/fetcher';
import showMessage from '../../../helper/showMessage';
import showRequestError from '../../../helper/showRequestError';
import DraggableDataTable from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import ProtectedRoute from '../../../components/Auth/ProtectedRoute';
import { usePermissionService } from '../../../hooks/usePermissionService';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import ReviewModal from './ReviewModal';

interface Review {
    id: string;
    provider: string;
    provider_name: string;
    customer: string;
    customer_email: string;
    customer_name: string;
    overall_rating: number;
    punctuality_rating: number;
    service_quality_rating: number;
    communication_rating: number;
    professionalism_rating: number;
    value_for_money_rating: number;
    average_detailed_rating: number;
    review_text: string;
    is_verified: boolean;
    is_public: boolean;
    job: string | null;
    request: string | null;
    created_at: string;
    updated_at: string;
}

interface Provider {
    id: string;
    name: string;
    company_name: string;
    email: string;
}

interface Customer {
    id: string;
    user: string;
    user_email: string;
    user_first_name: string;
    user_last_name: string;
    default_pickup_address: any;
    default_delivery_address: any;
    preferred_vehicle_types: any[];
    fragile_items_handling: boolean;
    insurance_preference: string;
    loyalty_points: number;
    referral_code: string;
    communication_preferences: any;
    marketing_opt_in: boolean;
    created_at: string;
    updated_at: string;
}

interface Job {
    id: string;
    title: string;
    status: string;
}

/** Normalize list endpoints that may return a bare array or DRF `{ results }` / `{ data }`. */
function unwrapList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
        const o = payload as Record<string, unknown>;
        if (Array.isArray(o.results)) return o.results as T[];
        if (Array.isArray(o.data)) return o.data as T[];
    }
    return [];
}

const ReviewManagement: React.FC = () => {
    const { hasPermission } = usePermissionService() as any;
    
    // State management
    const [reviews, setReviews] = useState<Review[]>([]);
    const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState({
        startDate: '',
        endDate: '',
    });
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [form, setForm] = useState({
        provider: '',
        customer: '',
        overall_rating: '',
        punctuality_rating: '',
        service_quality_rating: '',
        communication_rating: '',
        professionalism_rating: '',
        value_for_money_rating: '',
        review_text: '',
        is_verified: false,
        is_public: true,
        job: '',
    });

    // SWR data fetching
    const { data: reviewsData, isLoading: reviewsLoading, error: reviewsError } = useSWR('reviews/', fetcher);
    const { data: providersData } = useSWR('providers/', fetcher);
    const { data: customersData } = useSWR('customers/', fetcher);
    const { data: jobsData } = useSWR('jobs/', fetcher);

    const providers: Provider[] = unwrapList<Provider>(providersData);
    const customers: Customer[] = unwrapList<Customer>(customersData);
    const jobs: Job[] = unwrapList<Job>(jobsData);

    useEffect(() => {
        if (reviewsData == null) return;
        const list = unwrapList<Review>(reviewsData);
        setReviews(list);
        setFilteredReviews(list);
    }, [reviewsData]);

    // Filter reviews
    useEffect(() => {
        let filtered = reviews;

        if (searchTerm) {
            filtered = filtered.filter(review =>
                review.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (review.review_text && review.review_text.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (providerFilter) {
            filtered = filtered.filter(review => review.provider === providerFilter);
        }

        if (ratingFilter) {
            const minRating = parseFloat(ratingFilter);
            filtered = filtered.filter(review => {
                const rating = typeof review.overall_rating === 'string' ? parseFloat(review.overall_rating) : review.overall_rating;
                return !isNaN(rating) && rating >= minRating;
            });
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'verified') {
                filtered = filtered.filter(review => review.is_verified);
            } else if (statusFilter === 'unverified') {
                filtered = filtered.filter(review => !review.is_verified);
            } else if (statusFilter === 'public') {
                filtered = filtered.filter(review => review.is_public);
            } else if (statusFilter === 'private') {
                filtered = filtered.filter(review => !review.is_public);
            }
        }

        if (dateRangeFilter.startDate) {
            filtered = filtered.filter(review => 
                new Date(review.created_at) >= new Date(dateRangeFilter.startDate)
            );
        }

        if (dateRangeFilter.endDate) {
            filtered = filtered.filter(review => 
                new Date(review.created_at) <= new Date(dateRangeFilter.endDate)
            );
        }

        setFilteredReviews(filtered);
    }, [reviews, searchTerm, providerFilter, ratingFilter, statusFilter, dateRangeFilter]);


    // Helper functions
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderStars = (rating: number | string | null | undefined) => {
        // Convert rating to number and handle edge cases
        const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
        const safeRating = isNaN(numericRating) || numericRating === null || numericRating === undefined ? 0 : numericRating;
        
        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <IconStarFilled
                        key={star}
                        className={`w-4 h-4 ${
                            star <= safeRating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                    />
                ))}
                <span className="ml-1 text-sm font-medium">{safeRating.toFixed(1)}</span>
            </div>
        );
    };

    const getStatusBadge = (review: Review) => {
        if (review.is_verified && review.is_public) {
            return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Verified & Public</span>;
        } else if (review.is_verified) {
            return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Verified</span>;
        } else if (review.is_public) {
            return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Public</span>;
        } else {
            return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Private</span>;
        }
    };

    const openForm = (review?: Review) => {
        if (review) {
            setEditingReview(review);
            setForm({
                provider: review.provider,
                customer: review.customer,
                overall_rating: review.overall_rating.toString(),
                punctuality_rating: review.punctuality_rating.toString(),
                service_quality_rating: review.service_quality_rating.toString(),
                communication_rating: review.communication_rating.toString(),
                professionalism_rating: review.professionalism_rating.toString(),
                value_for_money_rating: review.value_for_money_rating.toString(),
                review_text: review.review_text || '',
                is_verified: review.is_verified,
                is_public: review.is_public,
                job: review.job || '',
            });
        } else {
            setEditingReview(null);
            setForm({
                provider: '',
                customer: '',
                overall_rating: '',
                punctuality_rating: '',
                service_quality_rating: '',
                communication_rating: '',
                professionalism_rating: '',
                value_for_money_rating: '',
                review_text: '',
                is_verified: false,
                is_public: true,
                job: '',
            });
        }
        setShowModal(true);
    };

    const closeForm = () => {
        setShowModal(false);
        setEditingReview(null);
        setForm({
            provider: '',
            customer: '',
            overall_rating: '',
            punctuality_rating: '',
            service_quality_rating: '',
            communication_rating: '',
            professionalism_rating: '',
            value_for_money_rating: '',
            review_text: '',
            is_verified: false,
            is_public: true,
            job: '',
        });
    };

    const handleFormChange = (field: string, value: any) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Helper functions for null handling
            const toNullIfEmpty = (value: string) => value.trim() === '' ? null : value;
            const toNumberOrNull = (value: string) => {
                const num = parseFloat(value);
                return isNaN(num) ? null : num;
            };

            const payload = {
                provider: toNullIfEmpty(form.provider),
                customer: toNullIfEmpty(form.customer),
                overall_rating: toNumberOrNull(form.overall_rating),
                punctuality_rating: toNumberOrNull(form.punctuality_rating),
                service_quality_rating: toNumberOrNull(form.service_quality_rating),
                communication_rating: toNumberOrNull(form.communication_rating),
                professionalism_rating: toNumberOrNull(form.professionalism_rating),
                value_for_money_rating: toNumberOrNull(form.value_for_money_rating),
                review_text: toNullIfEmpty(form.review_text),
                is_verified: form.is_verified,
                is_public: form.is_public,
                job: toNullIfEmpty(form.job),
            };

            if (editingReview) {
                await axiosInstance.put(`/reviews/${editingReview.id}/`, payload);
                showMessage('Review updated successfully');
            } else {
                await axiosInstance.post('/reviews/', payload);
                showMessage('Review created successfully');
            }

            mutate('reviews/');
            closeForm();
        } catch (error) {
            showRequestError(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (reviewId: string) => {
        try {
            const confirmed = window.confirm('Are you sure you want to delete this review?');
            if (confirmed) {
                setDeletingReviewId(reviewId);
                await axiosInstance.delete(`/reviews/${reviewId}/`);
                showMessage('Review deleted successfully');
                mutate('reviews/');
            }
        } catch (error) {
            showRequestError(error);
        } finally {
            setDeletingReviewId(null);
        }
    };

    const handleVerify = async (reviewId: string) => {
        try {
            await axiosInstance.post('/reviews/verify_review/', { review_id: reviewId });
            showMessage('Review verified successfully');
            mutate('reviews/');
        } catch (error) {
            showRequestError(error);
        }
    };

    const exportToCSV = () => {
        const headers = [
            'ID', 'Provider', 'Customer', 'Overall Rating', 'Punctuality', 'Service Quality',
            'Communication', 'Professionalism', 'Value for Money', 'Review Text',
            'Verified', 'Public', 'Created At'
        ];

        const csvData = filteredReviews.map(review => [
            review.id,
            review.provider_name,
            review.customer_name,
            review.overall_rating,
            review.punctuality_rating,
            review.service_quality_rating,
            review.communication_rating,
            review.professionalism_rating,
            review.value_for_money_rating,
            review.review_text || '',
            review.is_verified ? 'Yes' : 'No',
            review.is_public ? 'Yes' : 'No',
            formatDate(review.created_at)
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setProviderFilter('');
        setRatingFilter('');
        setStatusFilter('all');
        setDateRangeFilter({ startDate: '', endDate: '' });
    };

    // Table columns
    const columns = [
        {
            accessor: 'provider_name',
            title: 'Provider',
            sortable: true,
            render: (item: Review) => (
                <div className="font-medium text-gray-900 dark:text-white">
                    {item.provider_name}
                </div>
            ),
        },
        {
            accessor: 'customer_name',
            title: 'Customer',
            sortable: true,
            render: (item: Review) => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                        {item.customer_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.customer_email}
                    </div>
                </div>
            ),
        },
        {
            accessor: 'overall_rating',
            title: 'Overall Rating',
            sortable: true,
            render: (item: Review) => renderStars(item.overall_rating),
        },
        {
            accessor: 'average_detailed_rating',
            title: 'Detailed Avg',
            sortable: true,
            render: (item: Review) => renderStars(item.average_detailed_rating),
        },
        {
            accessor: 'review_text',
            title: 'Review',
            sortable: false,
            render: (item: Review) => (
                <div className="max-w-xs">
                    {item.review_text ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {item.review_text}
                        </p>
                    ) : (
                        <span className="text-sm text-gray-400 italic">No text</span>
                    )}
                </div>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            sortable: false,
            render: (item: Review) => getStatusBadge(item),
        },
        {
            accessor: 'created_at',
            title: 'Created',
            sortable: true,
            render: (item: Review) => (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(item.created_at)}
                </div>
            ),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            sortable: false,
            render: (item: Review) => (
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => openForm(item)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Review"
                    >
                        <IconEdit className="w-4 h-4" />
                    </button>
                    
                    {!item.is_verified && (
                        <button
                            onClick={() => handleVerify(item.id)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                            title="Verify Review"
                        >
                            <IconCheck className="w-4 h-4" />
                        </button>
                    )}

                    <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingReviewId === item.id}
                        className={`p-2 rounded-lg transition-colors ${
                            deletingReviewId === item.id
                                ? 'text-red-400 cursor-not-allowed bg-red-50'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                        }`}
                        title={deletingReviewId === item.id ? "Deleting..." : "Delete Review"}
                    >
                        {deletingReviewId === item.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <IconTrash className="w-4 h-4" />
                        )}
                    </button>
                </div>
            ),
        },
    ];

    if (reviewsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (reviewsError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <IconAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 dark:text-red-400">Failed to load reviews</p>
                    <button onClick={() => mutate('reviews/')} className="btn btn-primary mt-4">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedGroups={['Administrators']}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Review Management
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Manage customer reviews and ratings for providers
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex space-x-3">
                        <button
                            onClick={() => mutate('reviews/')}
                            className="btn btn-secondary"
                        >
                            <IconRefresh className="w-4 h-4 mr-2" />
                            Refresh
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="btn btn-secondary"
                        >
                            <IconDownload className="w-4 h-4 mr-2" />
                            Export CSV
                        </button>
                        <button
                            onClick={() => openForm()}
                            className="btn btn-primary"
                        >
                            <IconPlus className="w-4 h-4 mr-2" />
                            Add Review
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <IconStar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Reviews</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {reviews.length.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                <IconCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Verified</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {reviews.filter(r => r.is_verified).length.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                                <IconStarFilled className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Rating</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {reviews.length > 0 
                                        ? (reviews.reduce((sum, r) => {
                                            const rating = typeof r.overall_rating === 'string' ? parseFloat(r.overall_rating) : r.overall_rating;
                                            return sum + (isNaN(rating) ? 0 : rating);
                                        }, 0) / reviews.length).toFixed(1)
                                        : '0.0'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <IconEye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Public</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {reviews.filter(r => r.is_public).length.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Provider
                            </label>
                            <FilterSelect
                                value={providerFilter}
                                onChange={(value) => setProviderFilter(value as string)}
                                options={[
                                    { value: '', label: 'All Providers' },
                                    ...providers.map(provider => ({
                                        value: provider.id,
                                        label: provider.company_name || provider.name
                                    }))
                                ]}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Min Rating
                            </label>
                            <FilterSelect
                                value={ratingFilter}
                                onChange={(value) => setRatingFilter(value as string)}
                                options={[
                                    { value: '', label: 'All Ratings' },
                                    { value: '5', label: '5 Stars' },
                                    { value: '4', label: '4+ Stars' },
                                    { value: '3', label: '3+ Stars' },
                                    { value: '2', label: '2+ Stars' },
                                    { value: '1', label: '1+ Stars' },
                                ]}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <FilterSelect
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value as string)}
                                options={[
                                    { value: 'all', label: 'All Status' },
                                    { value: 'verified', label: 'Verified' },
                                    { value: 'unverified', label: 'Unverified' },
                                    { value: 'public', label: 'Public' },
                                    { value: 'private', label: 'Private' },
                                ]}
                            />
                        </div>

                        <div className="flex items-end space-x-2">
                            <button
                                onClick={clearFilters}
                                className="btn btn-secondary"
                            >
                                <IconFilterOff className="w-4 h-4 mr-2" />
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <DraggableDataTable
                    data={filteredReviews}
                    columns={columns}
                    loading={reviewsLoading}
                    title="Reviews"
                    exportFileName="reviews"
                    storeKey="reviews-table"
                    onRefreshData={() => mutate('reviews/')}
                    quickCheckFields={['provider_name', 'customer_name', 'overall_rating', 'review_text']}
                />

                {/* Add/Edit Review Modal */}
                <ReviewModal
                    isOpen={showModal}
                    editingReview={editingReview}
                    form={form}
                    providers={providers}
                    customers={customers}
                    jobs={jobs}
                    saving={saving}
                    onClose={closeForm}
                    onFormChange={handleFormChange}
                    onSave={handleSave}
                />
            </div>
        </ProtectedRoute>
    );
};

export default ReviewManagement;
