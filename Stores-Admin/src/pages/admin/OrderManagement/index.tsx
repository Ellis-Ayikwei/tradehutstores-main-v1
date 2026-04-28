// ORDER MANAGEMENT — Kinetic redesign
// Data fetching and action handlers preserved from original; only JSX layer swapped.
// Icons: lucide-react (replaces @tabler/icons-react)
// Tokens: Kinetic design system (see .claude/design-system/tokens.md)
import {
    AlertTriangle,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    Package,
    Eye,
    Download,
    Search,
    Filter,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    TrendingUp,
    ShoppingBag,
    RefreshCw,
    X,
} from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import axiosInstance from '../../../services/axiosInstance';

// ─── Types (unchanged from original) ────────────────────────────────────────
interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    total_amount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'refunded';
    items_count: number;
    shipping_address: string;
    created_at: string;
    updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

// ─── Status config ───────────────────────────────────────────────────────────
type FulfillmentStatus = Order['status'];
type PaymentStatus = Order['payment_status'];

const FULFILLMENT_STATUS_CONFIG: Record<
    FulfillmentStatus,
    { pill: string; dot: string; Icon: React.FC<{ className?: string }>; label: string }
> = {
    pending: {
        pill: 'bg-bid-amber/10 text-bid-amber',
        dot: 'bg-bid-amber animate-pulse',
        Icon: Clock,
        label: 'Pending',
    },
    processing: {
        pill: 'bg-tertiary-fixed/50 text-tertiary',
        dot: 'bg-tertiary',
        Icon: Package,
        label: 'Processing',
    },
    shipped: {
        pill: 'bg-surface-container-highest text-on-surface-variant',
        dot: 'bg-on-surface-variant',
        Icon: Truck,
        label: 'Shipped',
    },
    delivered: {
        pill: 'bg-bid-green/10 text-bid-green',
        dot: 'bg-bid-green',
        Icon: CheckCircle2,
        label: 'Delivered',
    },
    cancelled: {
        pill: 'bg-error-container text-on-error-container',
        dot: 'bg-error',
        Icon: XCircle,
        label: 'Cancelled',
    },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { pill: string; label: string }> = {
    pending: { pill: 'bg-bid-amber/10 text-bid-amber', label: 'Pending' },
    paid: { pill: 'bg-bid-green/10 text-bid-green', label: 'Paid' },
    refunded: { pill: 'bg-surface-container-highest text-on-surface-variant', label: 'Refunded' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface FulfillmentBadgeProps { status: string }
function FulfillmentBadge({ status }: FulfillmentBadgeProps) {
    const safe = (status || 'pending') as FulfillmentStatus;
    const cfg = FULFILLMENT_STATUS_CONFIG[safe] ?? FULFILLMENT_STATUS_CONFIG.pending;
    const { Icon } = cfg;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
            <Icon className="w-3 h-3 flex-shrink-0" />
            {cfg.label}
        </span>
    );
}

interface PaymentBadgeProps { status: string }
function PaymentBadge({ status }: PaymentBadgeProps) {
    const safe = (status || 'pending') as PaymentStatus;
    const cfg = PAYMENT_STATUS_CONFIG[safe] ?? PAYMENT_STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.pill}`}>
            {cfg.label}
        </span>
    );
}

interface KpiCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    iconBg: string;
    accent?: boolean;
}
function KpiCard({ label, value, icon, iconBg, accent }: KpiCardProps) {
    return (
        <div className={`bg-surface-container-lowest p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300${accent ? ' border-l-4 border-primary-container' : ''}`}>
            <div className="flex items-start justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant leading-tight max-w-[140px]">
                    {label}
                </span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    {icon}
                </div>
            </div>
            <span className="font-mono text-2xl font-bold text-on-surface">{value}</span>
        </div>
    );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
interface PaginationProps {
    current: number;
    total: number;
    perPage: number;
    onChange: (page: number) => void;
}
function Pagination({ current, total, perPage, onChange }: PaginationProps) {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return null;

    const start = (current - 1) * perPage + 1;
    const end = Math.min(current * perPage, total);

    // Build page buttons: always show 1, ..., current-1, current, current+1, ..., last
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    return (
        <div className="px-6 py-4 bg-surface-container-low/20 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-on-surface-variant font-medium">
                Showing {start}–{end} of {total} results
            </p>
            <div className="flex gap-1 items-center">
                <button
                    onClick={() => onChange(current - 1)}
                    disabled={current === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-lowest transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-on-surface-variant text-sm">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onChange(p as number)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                p === current
                                    ? 'bg-primary-container text-white shadow-sm'
                                    : 'border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-lowest'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onChange(current + 1)}
                    disabled={current === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-lowest transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Row action menu ─────────────────────────────────────────────────────────
interface RowMenuProps {
    order: Order;
    onClose: () => void;
}
function RowMenu({ order, onClose }: RowMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute right-8 top-full z-50 mt-1 min-w-[160px] bg-surface-container-lowest rounded-xl shadow-card-hover border border-outline-variant/20 py-1 animate-fadeIn"
        >
            <Link
                to={`/admin/orders/${order.id}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                onClick={onClose}
            >
                <Eye className="w-4 h-4 text-tertiary" />
                View Details
            </Link>
            <button
                onClick={() => { onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
            >
                <Download className="w-4 h-4 text-bid-green" />
                Download Invoice
            </button>
        </div>
    );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────
interface BulkBarProps {
    count: number;
    onClear: () => void;
}
function BulkBar({ count, onClear }: BulkBarProps) {
    return (
        <div className="flex items-center justify-between bg-on-background text-white px-6 py-3 rounded-xl shadow-card-hover animate-fadeIn">
            <span className="text-sm font-bold">
                {count} order{count !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
                <button className="px-4 py-1.5 bg-bid-green text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all">
                    Mark Shipped
                </button>
                <button className="px-4 py-1.5 bg-tertiary text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all">
                    Export Selected
                </button>
                <button
                    onClick={onClear}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                    title="Clear selection"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Status filter tabs ───────────────────────────────────────────────────────
const STATUS_TABS = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;

const PER_PAGE = 10;

// ─── Main Component ───────────────────────────────────────────────────────────
const OrderManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // ── Data fetch (unchanged) ────────────────────────────────────────────────
    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/orders/');
            setOrders(response.data);
        } catch (err) {
            setError('Failed to fetch orders. Please try again.');
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    // ── Derived counts ────────────────────────────────────────────────────────
    const counts = {
        all: orders.length,
        pending: orders.filter((o) => o.status === 'pending').length,
        processing: orders.filter((o) => o.status === 'processing').length,
        shipped: orders.filter((o) => o.status === 'shipped').length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const fulfillmentRate = orders.length
        ? Math.round((counts.delivered / orders.length) * 100)
        : 0;
    const lateOrders = counts.pending + counts.processing; // proxy for "needs attention"

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filtered = orders
        .filter((o) => activeFilter === 'all' || o.status === activeFilter)
        .filter((o) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
                (o.order_number || '').toLowerCase().includes(q) ||
                (o.customer_name || '').toLowerCase().includes(q) ||
                (o.customer_email || '').toLowerCase().includes(q)
            );
        });

    // Reset to page 1 when filter/search changes
    useEffect(() => { setPage(1); }, [activeFilter, search]);

    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    // ── Selection helpers ─────────────────────────────────────────────────────
    const allPageSelected = paginated.length > 0 && paginated.every((o) => selectedIds.has(o.id));

    const toggleSelectAll = () => {
        if (allPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                paginated.forEach((o) => next.delete(o.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                paginated.forEach((o) => next.add(o.id));
                return next;
            });
        }
    };

    const toggleRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <IconLoader className="w-10 h-10 animate-spin text-primary-container" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-20 md:pb-12">

            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                        Operations
                    </p>
                    <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                        Order Management
                    </h1>
                    <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-container text-[16px]">analytics</span>
                        Manage active marketplace transactions and shipping logistics.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchOrders}
                        className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 primary-gradient text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md active:scale-95 transition-all">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* ── Error Banner ─────────────────────────────────────────────── */}
            {error && (
                <div className="bg-error-container border border-error/20 text-on-error-container px-4 py-3 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-error" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* ── KPI Strip ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KpiCard
                    label="Today's Orders"
                    value={counts.all}
                    icon={<ShoppingBag className="w-5 h-5 text-primary-container" />}
                    iconBg="bg-primary-container/10"
                    accent
                />
                <KpiCard
                    label="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon={<TrendingUp className="w-5 h-5 text-bid-green" />}
                    iconBg="bg-bid-green/10"
                />
                <KpiCard
                    label="Fulfillment Rate"
                    value={`${fulfillmentRate}%`}
                    icon={<Truck className="w-5 h-5 text-tertiary" />}
                    iconBg="bg-tertiary/10"
                />
                <KpiCard
                    label="Needs Attention"
                    value={lateOrders}
                    icon={<Clock className="w-5 h-5 text-bid-amber" />}
                    iconBg="bg-bid-amber/10"
                />
            </div>

            {/* ── Filter / Search Bar ───────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-3">
                {/* Status tabs */}
                <div className="flex-1 bg-surface-container-low p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {STATUS_TABS.map((tab) => {
                        const count = counts[tab.key as keyof typeof counts] ?? 0;
                        const isActive = activeFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                                    isActive
                                        ? 'bg-surface-container-lowest shadow-card text-primary-container'
                                        : 'text-on-surface-variant hover:bg-surface-container-lowest/60'
                                }`}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isActive ? 'bg-primary-container/10 text-primary-container' : 'bg-surface-container text-on-surface-variant'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative flex items-center bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/15 lg:w-72">
                    <Search className="w-4 h-4 text-outline flex-shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search orders, customers…"
                        className="bg-transparent border-none focus:ring-0 outline-none text-sm ml-2 w-full placeholder:text-outline"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="ml-1 text-outline hover:text-on-surface transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Date range hint */}
                <div className="hidden lg:flex items-center gap-2 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/15 text-sm text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors">
                    <CalendarDays className="w-4 h-4 text-outline" />
                    <span className="font-medium">Last 30 Days</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-60" />
                </div>
            </div>

            {/* ── Bulk Action Bar ───────────────────────────────────────────── */}
            {selectedIds.size > 0 && (
                <BulkBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} />
            )}

            {/* ── Orders Table ──────────────────────────────────────────────── */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
                {/* Table header row */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-outline-variant/10">
                    <div className="flex items-center gap-3">
                        <h3 className="font-headline font-bold text-lg text-on-surface">
                            Active Transactions
                        </h3>
                        {filtered.length > 0 && (
                            <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-full">
                                {filtered.length}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-surface-container-low rounded-lg transition-colors active:scale-95">
                            <Filter className="w-4 h-4 text-on-surface-variant" />
                        </button>
                        <button
                            onClick={() => {/* Handle export */}}
                            className="p-2 hover:bg-surface-container-low rounded-lg transition-colors active:scale-95"
                        >
                            <Download className="w-4 h-4 text-on-surface-variant" />
                        </button>
                    </div>
                </div>

                {/* Scrollable table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low/30">
                                <th className="px-4 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allPageSelected}
                                        onChange={toggleSelectAll}
                                        className="rounded border-outline-variant text-primary-container focus:ring-primary-container/20 w-4 h-4 cursor-pointer"
                                    />
                                </th>
                                {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map((h) => (
                                    <th
                                        key={h}
                                        className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-on-surface-variant/60 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                                            <Package className="w-10 h-10 opacity-30" />
                                            <p className="font-medium text-sm">No orders found</p>
                                            {search && (
                                                <button
                                                    onClick={() => setSearch('')}
                                                    className="text-xs text-primary-container font-bold hover:underline"
                                                >
                                                    Clear search
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((order) => (
                                    <tr
                                        key={order.id}
                                        className={`hover:bg-surface-container-low/20 transition-colors group relative ${
                                            selectedIds.has(order.id) ? 'bg-primary-container/5' : ''
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-5">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(order.id)}
                                                onChange={() => toggleRow(order.id)}
                                                className="rounded border-outline-variant text-primary-container focus:ring-primary-container/20 w-4 h-4 cursor-pointer"
                                            />
                                        </td>

                                        {/* Order # */}
                                        <td className="px-6 py-5">
                                            <Link
                                                to={`/admin/orders/${order.id}`}
                                                className="font-mono text-xs font-bold text-primary-container hover:underline"
                                            >
                                                #{order.order_number || 'N/A'}
                                            </Link>
                                        </td>

                                        {/* Customer */}
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-on-surface">
                                                    {order.customer_name || 'N/A'}
                                                </span>
                                                <span className="text-xs text-on-surface-variant">
                                                    {order.customer_email || '—'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Items */}
                                        <td className="px-6 py-5">
                                            <span className="font-mono text-sm font-bold text-on-surface text-center block">
                                                {order.items_count ?? 0}
                                            </span>
                                        </td>

                                        {/* Total */}
                                        <td className="px-6 py-5 font-mono font-bold text-on-surface whitespace-nowrap">
                                            {formatCurrency(order.total_amount || 0)}
                                        </td>

                                        {/* Payment */}
                                        <td className="px-6 py-5">
                                            <PaymentBadge status={order.payment_status} />
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-5">
                                            <FulfillmentBadge status={order.status} />
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-5 text-sm text-on-surface-variant whitespace-nowrap">
                                            {order.created_at ? formatDate(order.created_at) : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center gap-1 justify-end relative">
                                                <Link
                                                    to={`/admin/orders/${order.id}`}
                                                    className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors active:scale-95"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4 text-tertiary" />
                                                </Link>
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                                                    className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors active:scale-95"
                                                    title="More actions"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-on-surface-variant" />
                                                </button>
                                                {openMenuId === order.id && (
                                                    <RowMenu order={order} onClose={() => setOpenMenuId(null)} />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                <Pagination
                    current={page}
                    total={filtered.length}
                    perPage={PER_PAGE}
                    onChange={setPage}
                />
            </div>

            {/* ── Contextual Insight Row ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Shipping health */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card border border-outline-variant/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary-container/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5 text-primary-container" />
                        </div>
                        <h4 className="font-headline font-bold text-on-surface">Shipping Health</h4>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-5 leading-relaxed">
                        {fulfillmentRate}% of orders fulfilled this period, against a 95% target.
                    </p>
                    <div className="w-full bg-surface-container rounded-full h-2 mb-2">
                        <div
                            className="bg-primary-container h-2 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(fulfillmentRate, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        <span>Current {fulfillmentRate}%</span>
                        <span>Target 95%</span>
                    </div>
                </div>

                {/* Pending attention */}
                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card border-l-4 border-bid-amber">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-bid-amber/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-bid-amber" />
                        </div>
                        <h4 className="font-headline font-bold text-on-surface">Pending Attention</h4>
                    </div>
                    <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
                        {counts.pending} orders are pending and {counts.processing} are in processing.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveFilter('pending')}
                            className="flex-1 px-3 py-2 bg-bid-amber/10 text-bid-amber rounded-lg text-xs font-bold hover:bg-bid-amber/20 transition-colors active:scale-95"
                        >
                            View Pending
                        </button>
                        <button
                            onClick={() => setActiveFilter('processing')}
                            className="flex-1 px-3 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
                        >
                            Processing
                        </button>
                    </div>
                </div>

                {/* Pro insight card */}
                <div className="bg-on-background text-white p-6 rounded-2xl shadow-card relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary opacity-20 blur-[60px] group-hover:opacity-40 transition-opacity pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full">
                        <span className="inline-block mb-3 px-3 py-1 bg-primary-container/20 text-primary-container rounded-full text-[10px] font-black tracking-widest uppercase w-fit">
                            Pro Tip
                        </span>
                        <h4 className="font-syne text-lg font-extrabold mb-2">Bulk Label Generator</h4>
                        <p className="text-white/60 text-sm leading-relaxed mb-5 flex-1">
                            Process up to 50 pending orders at once with automated shipping label generation.
                        </p>
                        <button className="bg-white text-on-surface px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform active:scale-95 w-fit">
                            Try Automation
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default OrderManagement;
