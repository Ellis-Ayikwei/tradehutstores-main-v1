import React, { useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, Download, Eye, FilterX, Loader2, MessageSquare, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ProtectedRoute from '../../../components/Auth/ProtectedRoute';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { StatCard } from '@/components/shadcn/stat-card';
import { cn } from '@/lib/utils';
import axiosInstance from '../../../services/axiosInstance';
import fetcher from '../../../services/fetcher';
import ReviewModal, { type ReviewForm } from './ReviewModal';

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

/** Pull a readable message out of an axios / DRF error. */
function requestErrorMessage(error: any): string {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) return data;
    if (data && typeof data === 'object') {
        if (typeof data.detail === 'string') return data.detail;
        const parts: string[] = [];
        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) parts.push(`${key}: ${value.join(', ')}`);
            else if (typeof value === 'string') parts.push(`${key}: ${value}`);
        }
        if (parts.length > 0) return parts.join('\n');
    }
    return error?.message || 'An unexpected error occurred. Please try again.';
}

const toRating = (rating: number | string | null | undefined): number => {
    const n = typeof rating === 'string' ? parseFloat(rating) : rating;
    return n == null || Number.isNaN(n) ? 0 : n;
};

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const EMPTY_FORM: ReviewForm = {
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
};

const Stars: React.FC<{ rating: number | string | null | undefined }> = ({ rating }) => {
    const safe = toRating(rating);
    return (
        <div className="flex items-center gap-0.5" aria-label={`${safe.toFixed(1)} out of 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={cn('h-4 w-4', s <= safe ? 'fill-current text-warning-500' : 'text-muted-foreground')} aria-hidden="true" />
            ))}
            <span className="ml-1 text-sm font-medium">{safe.toFixed(1)}</span>
        </div>
    );
};

const StatusBadge: React.FC<{ review: Review }> = ({ review }) => {
    if (review.is_verified && review.is_public) return <Badge variant="success">Verified & public</Badge>;
    if (review.is_verified) return <Badge variant="info">Verified</Badge>;
    if (review.is_public) return <Badge variant="warning">Public</Badge>;
    return <Badge variant="outline">Private</Badge>;
};

const ALL = 'all';
const PAGE_SIZES = [10, 25, 50, 100];

const ReviewManagement: React.FC = () => {
    const [search, setSearch] = useState('');
    const [providerFilter, setProviderFilter] = useState(ALL);
    const [ratingFilter, setRatingFilter] = useState(ALL);
    const [statusFilter, setStatusFilter] = useState(ALL);
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [showModal, setShowModal] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [form, setForm] = useState<ReviewForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [toDelete, setToDelete] = useState<Review | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data: reviewsData, isLoading: reviewsLoading, error: reviewsError } = useSWR('reviews/', fetcher);
    const { data: providersData } = useSWR('providers/', fetcher);
    const { data: customersData } = useSWR('customers/', fetcher);
    const { data: jobsData } = useSWR('jobs/', fetcher);

    const reviews = useMemo(() => unwrapList<Review>(reviewsData), [reviewsData]);
    const providers = useMemo(() => unwrapList<Provider>(providersData), [providersData]);
    const customers = useMemo(() => unwrapList<Customer>(customersData), [customersData]);
    const jobs = useMemo(() => unwrapList<Job>(jobsData), [jobsData]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = reviews.filter((r) => {
            if (q) {
                const hit =
                    (r.provider_name || '').toLowerCase().includes(q) ||
                    (r.customer_name || '').toLowerCase().includes(q) ||
                    (r.customer_email || '').toLowerCase().includes(q) ||
                    (r.review_text || '').toLowerCase().includes(q);
                if (!hit) return false;
            }
            if (providerFilter !== ALL && r.provider !== providerFilter) return false;
            if (ratingFilter !== ALL && toRating(r.overall_rating) < parseFloat(ratingFilter)) return false;
            if (statusFilter === 'verified' && !r.is_verified) return false;
            if (statusFilter === 'unverified' && r.is_verified) return false;
            if (statusFilter === 'public' && !r.is_public) return false;
            if (statusFilter === 'private' && r.is_public) return false;
            return true;
        });
        if (sort) {
            const key = sort.id as keyof Review;
            const numeric = key === 'overall_rating' || key === 'average_detailed_rating';
            list = [...list].sort((a, b) => {
                const cmp = numeric
                    ? toRating(a[key] as number) - toRating(b[key] as number)
                    : key === 'created_at'
                      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      : String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
                return sort.desc ? -cmp : cmp;
            });
        }
        return list;
    }, [reviews, search, providerFilter, ratingFilter, statusFilter, sort]);

    const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

    const stats = useMemo(
        () => ({
            total: reviews.length,
            verified: reviews.filter((r) => r.is_verified).length,
            public: reviews.filter((r) => r.is_public).length,
            avg: reviews.length > 0 ? reviews.reduce((sum, r) => sum + toRating(r.overall_rating), 0) / reviews.length : 0,
        }),
        [reviews]
    );

    const hasFilters = Boolean(search) || providerFilter !== ALL || ratingFilter !== ALL || statusFilter !== ALL;

    const clearFilters = () => {
        setSearch('');
        setProviderFilter(ALL);
        setRatingFilter(ALL);
        setStatusFilter(ALL);
        setPage(1);
    };

    const refresh = () => mutate('reviews/');

    const openForm = (review?: Review) => {
        if (review) {
            setEditingReview(review);
            setForm({
                provider: review.provider,
                customer: review.customer,
                overall_rating: String(review.overall_rating ?? ''),
                punctuality_rating: String(review.punctuality_rating ?? ''),
                service_quality_rating: String(review.service_quality_rating ?? ''),
                communication_rating: String(review.communication_rating ?? ''),
                professionalism_rating: String(review.professionalism_rating ?? ''),
                value_for_money_rating: String(review.value_for_money_rating ?? ''),
                review_text: review.review_text || '',
                is_verified: review.is_verified,
                is_public: review.is_public,
                job: review.job || '',
            });
        } else {
            setEditingReview(null);
            setForm(EMPTY_FORM);
        }
        setShowModal(true);
    };

    const closeForm = () => {
        setShowModal(false);
        setEditingReview(null);
        setForm(EMPTY_FORM);
    };

    const handleFormChange = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        try {
            setSaving(true);
            const toNullIfEmpty = (value: string) => (value.trim() === '' ? null : value);
            const toNumberOrNull = (value: string) => {
                const num = parseFloat(value);
                return Number.isNaN(num) ? null : num;
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
                toast.success('Review updated successfully');
            } else {
                await axiosInstance.post('/reviews/', payload);
                toast.success('Review created successfully');
            }
            refresh();
            closeForm();
        } catch (error) {
            console.error('Review save failed:', error);
            toast.error(requestErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            setDeleting(true);
            await axiosInstance.delete(`/reviews/${toDelete.id}/`);
            toast.success('Review deleted successfully');
            setToDelete(null);
            refresh();
        } catch (error) {
            console.error('Review delete failed:', error);
            toast.error(requestErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const handleVerify = async (reviewId: string) => {
        try {
            await axiosInstance.post('/reviews/verify_review/', { review_id: reviewId });
            toast.success('Review verified successfully');
            refresh();
        } catch (error) {
            console.error('Review verify failed:', error);
            toast.error(requestErrorMessage(error));
        }
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Provider', 'Customer', 'Overall Rating', 'Punctuality', 'Service Quality', 'Communication', 'Professionalism', 'Value for Money', 'Review Text', 'Verified', 'Public', 'Created At'];
        const rows = filtered.map((r) => [
            r.id,
            r.provider_name,
            r.customer_name,
            r.overall_rating,
            r.punctuality_rating,
            r.service_quality_rating,
            r.communication_rating,
            r.professionalism_rating,
            r.value_for_money_rating,
            r.review_text || '',
            r.is_verified ? 'Yes' : 'No',
            r.is_public ? 'Yes' : 'No',
            formatDate(r.created_at),
        ]);
        const csv = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const rowActions = (r: Review) => (
        <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => openForm(r)} title="Edit review" aria-label="Edit review">
                <Pencil aria-hidden="true" />
            </Button>
            {!r.is_verified && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleVerify(r.id)} title="Verify review" aria-label="Verify review">
                    <Check aria-hidden="true" />
                </Button>
            )}
            <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setToDelete(r)} title="Delete review" aria-label="Delete review">
                <Trash2 aria-hidden="true" />
            </Button>
        </div>
    );

    const columns = useMemo<ColumnDef<Review>[]>(
        () => [
            {
                id: 'provider_name',
                accessorKey: 'provider_name',
                header: 'Provider',
                meta: { label: 'Provider', cardTitle: true },
                cell: ({ row }) => <span className="font-medium">{row.original.provider_name}</span>,
            },
            {
                id: 'customer_name',
                accessorKey: 'customer_name',
                header: 'Customer',
                meta: { label: 'Customer' },
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{row.original.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{row.original.customer_email}</div>
                    </div>
                ),
            },
            {
                id: 'overall_rating',
                accessorKey: 'overall_rating',
                header: 'Overall',
                meta: { label: 'Overall' },
                cell: ({ row }) => <Stars rating={row.original.overall_rating} />,
            },
            {
                id: 'average_detailed_rating',
                accessorKey: 'average_detailed_rating',
                header: 'Detailed avg',
                meta: { label: 'Detailed avg' },
                cell: ({ row }) => <Stars rating={row.original.average_detailed_rating} />,
            },
            {
                id: 'review_text',
                accessorKey: 'review_text',
                header: 'Review',
                enableSorting: false,
                meta: { label: 'Review', className: 'max-w-xs' },
                cell: ({ row }) =>
                    row.original.review_text ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{row.original.review_text}</p>
                    ) : (
                        <span className="text-sm italic text-muted-foreground">No text</span>
                    ),
            },
            {
                id: 'status',
                header: 'Status',
                enableSorting: false,
                meta: { label: 'Status' },
                cell: ({ row }) => <StatusBadge review={row.original} />,
            },
            {
                id: 'created_at',
                accessorKey: 'created_at',
                header: 'Created',
                meta: { label: 'Created' },
                cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>,
            },
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                enableSorting: false,
                enableHiding: false,
                cell: ({ row }) => rowActions(row.original),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
        set(v);
        setPage(1);
    };

    return (
        <ProtectedRoute allowedGroups={['Administrators']}>
            <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Reviews"
                    description="Manage customer reviews and ratings."
                    actions={
                        <>
                            <Button type="button" variant="outline" onClick={refresh} disabled={reviewsLoading}>
                                <RefreshCw className={reviewsLoading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
                            </Button>
                            <Button type="button" variant="outline" onClick={exportToCSV} disabled={filtered.length === 0}>
                                <Download aria-hidden="true" /> Export CSV
                            </Button>
                            <Button type="button" onClick={() => openForm()}>
                                <Plus aria-hidden="true" /> Add review
                            </Button>
                        </>
                    }
                />

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard label="Total reviews" value={stats.total.toLocaleString()} icon={MessageSquare} isLoading={reviewsLoading} />
                    <StatCard label="Verified" value={stats.verified.toLocaleString()} icon={Check} isLoading={reviewsLoading} />
                    <StatCard label="Avg rating" value={stats.avg.toFixed(1)} icon={Star} isLoading={reviewsLoading} />
                    <StatCard label="Public" value={stats.public.toLocaleString()} icon={Eye} isLoading={reviewsLoading} />
                </div>

                <DataTable<Review>
                    columns={columns}
                    data={paged}
                    total={filtered.length}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={PAGE_SIZES}
                    onPageChange={setPage}
                    onPageSizeChange={(n) => {
                        setPageSize(n);
                        setPage(1);
                    }}
                    sort={sort}
                    onSortChange={(s) => {
                        setSort(s);
                        setPage(1);
                    }}
                    search={search}
                    onSearchChange={resetPage(setSearch)}
                    searchPlaceholder="Search provider, customer or text"
                    isLoading={reviewsLoading}
                    error={reviewsError ? new Error(requestErrorMessage(reviewsError) || 'Failed to load reviews') : undefined}
                    onRetry={refresh}
                    getRowId={(r) => r.id}
                    toolbar={
                        <>
                            <Select value={providerFilter} onValueChange={resetPage(setProviderFilter)}>
                                <SelectTrigger className="w-[170px]" aria-label="Filter by provider">
                                    <SelectValue placeholder="Provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All providers</SelectItem>
                                    {providers.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.company_name || p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={ratingFilter} onValueChange={resetPage(setRatingFilter)}>
                                <SelectTrigger className="w-[140px]" aria-label="Filter by minimum rating">
                                    <SelectValue placeholder="Rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All ratings</SelectItem>
                                    <SelectItem value="5">5 stars</SelectItem>
                                    <SelectItem value="4">4+ stars</SelectItem>
                                    <SelectItem value="3">3+ stars</SelectItem>
                                    <SelectItem value="2">2+ stars</SelectItem>
                                    <SelectItem value="1">1+ stars</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={resetPage(setStatusFilter)}>
                                <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All status</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="unverified">Unverified</SelectItem>
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                            </Select>
                            {hasFilters ? (
                                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                                    <FilterX aria-hidden="true" /> Clear
                                </Button>
                            ) : null}
                        </>
                    }
                    emptyState={
                        <EmptyState
                            icon={MessageSquare}
                            title={reviews.length === 0 ? 'No reviews yet' : 'No reviews match'}
                            description={reviews.length === 0 ? 'Reviews will appear here once customers submit them.' : 'Try a different search or clear your filters.'}
                        />
                    }
                    renderMobileCard={(r) => (
                        <Card key={r.id}>
                            <CardContent className="space-y-3 p-4 pt-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">{r.provider_name}</p>
                                        <p className="truncate text-sm">{r.customer_name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{r.customer_email}</p>
                                    </div>
                                    <StatusBadge review={r} />
                                </div>
                                <Stars rating={r.overall_rating} />
                                {r.review_text ? <p className="line-clamp-3 text-sm text-muted-foreground">{r.review_text}</p> : <p className="text-sm italic text-muted-foreground">No text</p>}
                                <div className="flex items-center justify-between border-t border-border pt-3">
                                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                                    {rowActions(r)}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                />

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

                <Dialog open={toDelete !== null} onOpenChange={(o) => (!o && !deleting ? setToDelete(null) : undefined)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete this review?</DialogTitle>
                            <DialogDescription>This permanently removes the review. This cannot be undone.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
                                Cancel
                            </Button>
                            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ProtectedRoute>
    );
};

export default ReviewManagement;
