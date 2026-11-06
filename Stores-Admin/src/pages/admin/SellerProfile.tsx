// Seller Profile — Admin view
// Ported from stitch_full_website_redesign_expansion/tradehut_seller_profile/code.html
// Data wiring stubs only — swap when API is ready.
//
// TODO: fetch /api/admin/sellers/{id}/   (GET)
// TODO: PATCH /api/admin/sellers/{id}/   (suspend / verify / commission / note)

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconLoader from '../../components/Icon/IconLoader';
import { useCurrency } from '../../contexts/CurrencyContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SellerDetail {
    id: string;
    business_name: string;
    business_description?: string;
    store_logo?: string;
    store_banner?: string;
    verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
    is_verified: boolean;
    is_active: boolean;
    is_accepting_orders: boolean;
    total_sales: number;
    total_orders: number;
    rating: number;
    total_reviews: number;
    response_rate?: number;
    joined_date?: string;
    location?: string;
    commission_rate?: number;
    user: {
        id: string;
        username: string;
        email: string;
        first_name?: string;
        last_name?: string;
    };
}

interface Listing {
    id: string;
    name: string;
    price: number | null;
    image?: string;
    is_rfq?: boolean;
    is_auction?: boolean;
    bid_count?: number;
    badge?: string;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
}

interface Review {
    id: string;
    reviewer_name: string;
    reviewer_avatar?: string;
    rating: number;
    comment: string;
    created_at: string;
}

interface ActivityEvent {
    id: string;
    icon: string;
    description: string;
    timestamp: string;
    type: 'sale' | 'review' | 'dispute' | 'system' | 'admin';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));

type VStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

const STATUS_STYLES: Record<VStatus, string> = {
    verified:  'bg-bid-green/10 text-bid-green',
    pending:   'bg-bid-amber/10 text-bid-amber',
    rejected:  'bg-error-container text-on-error-container',
    suspended: 'bg-bid-red/10 text-bid-red',
};

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
    pending:    'bg-bid-amber/10 text-bid-amber',
    processing: 'bg-secondary-container text-on-secondary-container',
    shipped:    'bg-surface-container-highest text-on-surface-variant',
    delivered:  'bg-bid-green/10 text-bid-green',
    cancelled:  'bg-error-container text-on-error-container',
};

// ─── Pill component ──────────────────────────────────────────────────────────

function Pill({ icon, children }: { icon?: string; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full">
            {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
            {children}
        </span>
    );
}

// ─── Star rating row ─────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <span
                    key={i}
                    className={`material-symbols-outlined text-sm ${i <= Math.round(rating) ? 'text-primary-container' : 'text-outline-variant'}`}
                    style={{ fontVariationSettings: i <= Math.round(rating) ? "'FILL' 1" : "'FILL' 0" }}
                >
                    star
                </span>
            ))}
        </div>
    );
}

// ─── Tab list ────────────────────────────────────────────────────────────────

const TABS = ['About', 'Listings', 'Orders', 'Reviews', 'Disputes', 'Admin Actions'] as const;
type Tab = (typeof TABS)[number];

const ACTIVITY_TYPE_STYLES: Record<ActivityEvent['type'], string> = {
    sale:    'bg-bid-green/10 text-bid-green',
    review:  'bg-primary-container/10 text-primary-container',
    dispute: 'bg-bid-red/10 text-bid-red',
    system:  'bg-surface-container text-on-surface-variant',
    admin:   'bg-tertiary/10 text-tertiary',
};

// ─── Admin Actions Panel ──────────────────────────────────────────────────────

interface AdminActionsPanelProps {
    seller: SellerDetail;
    onStatusChange: (newStatus: VStatus, note: string) => void;
    onCommissionChange: (rate: number) => void;
    onNoteAdd: (note: string) => void;
}

function AdminActionsPanel({ seller, onStatusChange, onCommissionChange, onNoteAdd }: AdminActionsPanelProps) {
    const [commissionDraft, setCommissionDraft] = useState(String(seller.commission_rate ?? 8.5));
    const [noteDraft, setNoteDraft] = useState('');
    const [suspendReason, setSuspendReason] = useState('');
    const [showSuspendField, setShowSuspendField] = useState(false);

    const isSuspended = seller.verification_status === 'suspended' || !seller.is_active;

    return (
        <div className="space-y-6">
            {/* Status actions */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10">
                <h3 className="font-headline font-bold text-lg text-on-surface mb-5">Account Actions</h3>
                <div className="space-y-3">
                    {seller.verification_status !== 'verified' && (
                        <button
                            onClick={() => onStatusChange('verified', 'Verified by admin')}
                            className="w-full py-3 px-5 bg-gradient-to-r from-k-secondary to-secondary-fixed-dim text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-card-hover active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                            Verify Seller
                        </button>
                    )}

                    {!isSuspended ? (
                        <>
                            <button
                                onClick={() => setShowSuspendField((v) => !v)}
                                className="w-full py-3 px-5 bg-bid-red/10 text-bid-red font-bold rounded-xl flex items-center justify-center gap-2 border border-bid-red/20 hover:bg-bid-red/20 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-base">block</span>
                                Suspend Account
                            </button>
                            {showSuspendField && (
                                <div className="space-y-2">
                                    <textarea
                                        value={suspendReason}
                                        onChange={(e) => setSuspendReason(e.target.value)}
                                        placeholder="Reason for suspension…"
                                        rows={3}
                                        className="form-textarea w-full text-sm rounded-xl border-outline-variant/20 bg-surface-container-low focus:ring-primary-container focus:border-primary-container resize-none"
                                    />
                                    <button
                                        onClick={() => { onStatusChange('suspended', suspendReason); setShowSuspendField(false); setSuspendReason(''); }}
                                        disabled={!suspendReason.trim()}
                                        className="w-full py-2.5 px-4 bg-bid-red text-white text-sm font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                                    >
                                        Confirm Suspension
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => onStatusChange('verified', 'Reinstated by admin')}
                            className="w-full py-3 px-5 bg-bid-green/10 text-bid-green font-bold rounded-xl flex items-center justify-center gap-2 border border-bid-green/20 hover:bg-bid-green/20 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Reinstate Account
                        </button>
                    )}
                </div>
            </div>

            {/* Commission */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10">
                <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Commission Rate</h3>
                <p className="text-xs text-on-surface-variant mb-3">Override the platform default commission for this seller.</p>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            value={commissionDraft}
                            onChange={(e) => setCommissionDraft(e.target.value)}
                            className="form-input w-full text-sm rounded-xl border-outline-variant/20 bg-surface-container-low focus:ring-primary-container focus:border-primary-container pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">%</span>
                    </div>
                    <button
                        onClick={() => onCommissionChange(parseFloat(commissionDraft))}
                        className="px-4 py-2.5 primary-gradient text-white text-sm font-bold rounded-xl hover:shadow-card active:scale-95 transition-all whitespace-nowrap"
                    >
                        Apply
                    </button>
                </div>
            </div>

            {/* Internal note */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10">
                <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Add Internal Note</h3>
                <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Internal note visible to admins only…"
                    rows={4}
                    className="form-textarea w-full text-sm rounded-xl border-outline-variant/20 bg-surface-container-low focus:ring-primary-container focus:border-primary-container resize-none mb-3"
                />
                <button
                    onClick={() => { onNoteAdd(noteDraft); setNoteDraft(''); }}
                    disabled={!noteDraft.trim()}
                    className="w-full py-2.5 px-4 bg-surface-container text-on-surface-variant text-sm font-bold rounded-xl border border-outline-variant/20 hover:bg-surface-container-high disabled:opacity-40 active:scale-95 transition-all"
                >
                    Save Note
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SellerProfile = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch();
    const { formatDisplayPrice: fmt$ } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [seller, setSeller] = useState<SellerDetail | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('About');

    useEffect(() => {
        dispatch(setPageTitle('Seller Profile'));
    }, [dispatch]);

    useEffect(() => {
        if (!id) return;

        // TODO: fetch /api/admin/sellers/{id}/
        // TODO: fetch /api/admin/sellers/{id}/listings/
        // TODO: fetch /api/admin/sellers/{id}/orders/
        // TODO: fetch /api/admin/sellers/{id}/reviews/
        // TODO: fetch /api/admin/sellers/{id}/activity/

        // No API wired yet: show the empty/not-found state, never fake sellers (AGENTS.md section 1b).
        setSeller(null);
        setListings([]);
        setOrders([]);
        setReviews([]);
        setActivity([]);
        setLoading(false);
    }, [id]);

    // ── Action handlers ───────────────────────────────────────────────────────

    const handleStatusChange = (newStatus: VStatus, note: string) => {
        // TODO: PATCH /api/admin/sellers/{id}/  { verification_status: newStatus, verification_notes: note }
        console.log('PATCH seller status', newStatus, note);
        if (seller) setSeller({ ...seller, verification_status: newStatus, is_active: newStatus !== 'suspended' });
    };

    const handleCommissionChange = (rate: number) => {
        // TODO: PATCH /api/admin/sellers/{id}/  { commission_rate: rate }
        console.log('PATCH commission', rate);
        if (seller) setSeller({ ...seller, commission_rate: rate });
    };

    const handleNoteAdd = (note: string) => {
        // TODO: POST /api/admin/sellers/{id}/notes/  { body: note }
        console.log('POST note', note);
    };

    // ── Loading state ─────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <IconLoader className="w-10 h-10 animate-spin text-primary-container" />
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <span className="material-symbols-outlined text-5xl text-outline">storefront</span>
                <p className="text-on-surface-variant font-medium">Seller not found.</p>
                <Link
                    to="/admin/sellers/list"
                    className="text-primary-container text-sm font-bold hover:underline active:scale-95 transition-transform"
                >
                    Back to Sellers
                </Link>
            </div>
        );
    }

    const vStatus = seller.verification_status as VStatus;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-20 md:pb-12">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-on-surface transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <Link to="/admin/sellers/list" className="hover:text-on-surface transition-colors">Sellers</Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-on-surface font-medium truncate max-w-[160px]">{seller.business_name}</span>
            </nav>

            {/* ── Cover + Identity ──────────────────────────────────────────── */}
            <section className="relative group rounded-2xl overflow-hidden">
                {/* Cover banner */}
                <div className="aspect-[4/1] w-full bg-surface-container-low overflow-hidden">
                    {seller.store_banner ? (
                        <img
                            loading="lazy"
                            src={seller.store_banner}
                            alt="Cover"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full primary-gradient opacity-30" />
                    )}
                </div>

                {/* Avatar + name — floats below the banner on mobile, overlapping on md+ */}
                <div className="px-4 md:px-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 sm:-mt-16 relative z-10">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-surface bg-surface-container-lowest overflow-hidden shadow-card">
                                {seller.store_logo ? (
                                    <img loading="lazy" src={seller.store_logo} alt={seller.business_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-surface-container">
                                        <span className="material-symbols-outlined text-4xl text-outline">storefront</span>
                                    </div>
                                )}
                            </div>
                            {seller.is_verified && (
                                <div className="absolute bottom-1 right-1 bg-k-secondary text-on-secondary p-0.5 rounded-full border-2 border-surface shadow-sm">
                                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                            )}
                        </div>

                        {/* Name + badges + meta */}
                        <div className="flex-1 min-w-0 pb-1 sm:pb-4">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="font-syne font-extrabold text-2xl md:text-3xl lg:text-4xl text-on-surface tracking-tight truncate">
                                    {seller.business_name}
                                </h1>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[vStatus]}`}>
                                    {seller.verification_status}
                                </span>
                                {seller.is_accepting_orders && (
                                    <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest">
                                        Accepting Orders
                                    </span>
                                )}
                            </div>
                            <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2">
                                {seller.business_description ?? 'No description provided.'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── KPI Strip ────────────────────────────────────────────────── */}
            <div className="bg-surface-container-low rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Sales',    value: fmt$(seller.total_sales),          icon: 'payments'      },
                    { label: 'Listings',       value: String(listings.length),            icon: 'layers'        },
                    { label: 'Avg Rating',     value: seller.rating.toFixed(1),           icon: 'star'          },
                    { label: 'Response Rate',  value: `${seller.response_rate ?? '—'}%`,  icon: 'mark_chat_read'},
                ].map(({ label, value, icon }) => (
                    <div key={label} className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-1.5 mb-1">
                            <span className="material-symbols-outlined text-primary-container text-base">{icon}</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
                        </div>
                        <p className="font-mono font-bold text-xl text-on-surface">{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Two-column layout: main content + right rail ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Main column */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Tab bar */}
                    <div className="overflow-x-auto no-scrollbar">
                        <div className="flex gap-6 border-b border-outline-variant/15 min-w-max">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors active:scale-95 ${
                                        activeTab === tab
                                            ? 'text-primary-container border-b-2 border-primary-container'
                                            : 'text-on-surface-variant/60 hover:text-on-surface-variant'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── About tab ──────────────────────────────────────────── */}
                    {activeTab === 'About' && (
                        <div className="space-y-5">
                            <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10">
                                <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Business Details</h3>
                                <dl className="space-y-4">
                                    {[
                                        { icon: 'calendar_today', label: 'Member since', value: seller.joined_date ? fmtDate(seller.joined_date) : '—' },
                                        { icon: 'location_on',    label: 'Location',     value: seller.location ?? '—' },
                                        { icon: 'mail',           label: 'Email',        value: seller.user.email },
                                        { icon: 'person',         label: 'Account',      value: `${seller.user.first_name ?? ''} ${seller.user.last_name ?? ''}`.trim() || seller.user.username },
                                        { icon: 'payments',       label: 'Commission',   value: `${seller.commission_rate ?? 8.5}%` },
                                    ].map(({ icon, label, value }) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-on-surface-variant/60 text-lg w-5 text-center">{icon}</span>
                                            <dt className="text-xs font-bold uppercase tracking-widest text-on-surface-variant w-28 flex-shrink-0">{label}</dt>
                                            <dd className="text-sm text-on-surface">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            {/* Recent activity */}
                            <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10">
                                <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Recent Activity</h3>
                                <ul className="space-y-4">
                                    {activity.map((ev) => (
                                        <li key={ev.id} className="flex items-start gap-3">
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ACTIVITY_TYPE_STYLES[ev.type]}`}>
                                                <span className="material-symbols-outlined text-sm">{ev.icon}</span>
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-on-surface">{ev.description}</p>
                                                <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                                                    {fmtDate(ev.timestamp)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* ── Listings tab ────────────────────────────────────────── */}
                    {activeTab === 'Listings' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-on-surface-variant">{listings.length} active listing{listings.length !== 1 ? 's' : ''}</p>
                                <Link
                                    to="/admin/products/list"
                                    className="text-primary-container text-sm font-bold flex items-center gap-1 hover:underline active:scale-95 transition-transform"
                                >
                                    View All
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {listings.map((item) => (
                                    <article key={item.id} className="group cursor-pointer bg-surface-container-lowest rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300">
                                        <div className="aspect-square rounded-t-xl overflow-hidden bg-surface-container-low">
                                            {item.image ? (
                                                <img
                                                    loading="lazy"
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl text-outline">inventory_2</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-1">
                                            <h3 className="font-syne font-bold text-sm text-on-surface group-hover:text-primary-container transition-colors truncate">
                                                {item.name}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                {item.is_rfq ? (
                                                    <p className="font-mono font-bold text-tertiary text-sm">RFQ ONLY</p>
                                                ) : item.price != null ? (
                                                    <p className="font-mono font-bold text-k-secondary text-sm">{fmt$(item.price)}</p>
                                                ) : null}
                                                <span className="flex items-center gap-1">
                                                    {item.is_auction && item.bid_count != null && (
                                                        <Pill icon="gavel">{item.bid_count} Bids</Pill>
                                                    )}
                                                    {item.badge && (
                                                        <span className="px-1.5 py-0.5 bg-tertiary-fixed rounded text-[8px] font-bold uppercase tracking-tighter">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Orders tab ──────────────────────────────────────────── */}
                    {activeTab === 'Orders' && (
                        <div className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden border border-outline-variant/10">
                            <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
                                <h3 className="font-headline font-bold text-lg text-on-surface">Orders ({orders.length})</h3>
                                <Link
                                    to="/admin/orders/list"
                                    className="text-primary-container text-sm font-bold flex items-center gap-1 hover:underline active:scale-95 transition-transform"
                                >
                                    View All
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-container-low/50">
                                            {['Order', 'Customer', 'Status', 'Date', 'Amount'].map((h) => (
                                                <th key={h} className="px-5 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/10">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-surface-container-low/30 transition-colors">
                                                <td className="px-5 py-3 font-mono text-sm text-on-surface whitespace-nowrap">#{order.order_number}</td>
                                                <td className="px-5 py-3 text-sm text-on-surface">{order.customer_name}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ORDER_STATUS_STYLES[(order.status as OrderStatus)] ?? 'bg-surface-container text-on-surface-variant'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-on-surface-variant whitespace-nowrap">{fmtDate(order.created_at)}</td>
                                                <td className="px-5 py-3 font-mono font-bold text-on-surface whitespace-nowrap">{fmt$(order.total_amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Reviews tab ─────────────────────────────────────────── */}
                    {activeTab === 'Reviews' && (
                        <div className="space-y-4">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="bg-surface-container-lowest rounded-2xl shadow-card p-5 border border-outline-variant/10">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex-shrink-0 overflow-hidden">
                                            {rev.reviewer_avatar ? (
                                                <img loading="lazy" src={rev.reviewer_avatar} alt={rev.reviewer_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="w-full h-full flex items-center justify-center material-symbols-outlined text-base text-outline">person</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between flex-wrap gap-1">
                                                <p className="font-bold text-sm text-on-surface">{rev.reviewer_name}</p>
                                                <p className="text-[10px] text-on-surface-variant/60">{fmtDate(rev.created_at)}</p>
                                            </div>
                                            <Stars rating={rev.rating} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-on-surface-variant leading-relaxed">{rev.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Disputes tab ────────────────────────────────────────── */}
                    {activeTab === 'Disputes' && (
                        <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10 flex flex-col items-center gap-4 py-16">
                            <span className="material-symbols-outlined text-5xl text-outline">balance</span>
                            <p className="text-on-surface-variant text-sm">Dispute history will appear here.</p>
                            <Link
                                to="/admin/support/disputes"
                                className="text-primary-container text-sm font-bold flex items-center gap-1 hover:underline active:scale-95 transition-transform"
                            >
                                Go to Disputes
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </Link>
                        </div>
                    )}

                    {/* ── Admin Actions tab (inline, mirrors the right-rail panel on narrow screens) */}
                    {activeTab === 'Admin Actions' && (
                        <AdminActionsPanel
                            seller={seller}
                            onStatusChange={handleStatusChange}
                            onCommissionChange={handleCommissionChange}
                            onNoteAdd={handleNoteAdd}
                        />
                    )}
                </div>

                {/* ── Right rail ─────────────────────────────────────────────── */}
                <aside className="lg:col-span-4 space-y-4">
                    <div className="lg:sticky lg:top-24 space-y-4">

                        {/* Quick info card */}
                        <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6 border border-outline-variant/10">
                            <h2 className="font-syne font-bold text-xl text-on-surface mb-5">Seller Info</h2>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-3 text-sm">
                                    <span className="material-symbols-outlined text-on-surface-variant/60">calendar_today</span>
                                    <span className="text-on-surface-variant">
                                        Joined {seller.joined_date ? fmtDate(seller.joined_date) : '—'}
                                    </span>
                                </li>
                                <li className="flex items-center gap-3 text-sm">
                                    <span className="material-symbols-outlined text-on-surface-variant/60">location_on</span>
                                    <span className="text-on-surface-variant">{seller.location ?? '—'}</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm">
                                    <span className="material-symbols-outlined text-on-surface-variant/60">mail</span>
                                    <span className="text-on-surface-variant truncate">{seller.user.email}</span>
                                </li>
                                {seller.is_verified && (
                                    <li className="flex items-center gap-3 text-sm">
                                        <span className="material-symbols-outlined text-k-secondary">verified_user</span>
                                        <span className="text-on-surface-variant">Identity Verified</span>
                                    </li>
                                )}
                            </ul>

                            {/* Admin action buttons (visible on lg+; tab used on smaller breakpoints) */}
                            <div className="hidden lg:block space-y-3 pt-5 border-t border-outline-variant/10">
                                <AdminActionsPanel
                                    seller={seller}
                                    onStatusChange={handleStatusChange}
                                    onCommissionChange={handleCommissionChange}
                                    onNoteAdd={handleNoteAdd}
                                />
                            </div>
                        </div>

                        {/* Trust / Escrow badge */}
                        <div className="bg-bid-green/5 rounded-2xl p-4 border border-bid-green/10 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-bid-green flex items-center justify-center text-white flex-shrink-0">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-k-secondary uppercase tracking-tighter">Buyer Protection</p>
                                <p className="text-[10px] text-on-surface-variant/80">Every transaction is secured via TradeHut Escrow.</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default SellerProfile;
