// E-COMMERCE / SELLER DASHBOARD — Kinetic redesign
// Data wiring via SWR is preserved from original; only the JSX layer is swapped.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconLoader from '../../components/Icon/IconLoader';
import { useCurrency } from '../../contexts/CurrencyContext';

// ─── Types (unchanged from original) ────────────────────────────────────────
interface DashboardStats {
    total_revenue: number;
    revenue_growth: number;
    total_orders: number;
    orders_growth: number;
    total_customers: number;
    customers_growth: number;
    average_order_value: number;
    aov_growth: number;
    pending_orders: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_products: number;
}

interface RecentOrder {
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
}

interface TopProduct {
    id: string;
    name: string;
    sales_count: number;
    revenue: number;
    image?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
    pending:    'bg-bid-amber/10 text-bid-amber',
    processing: 'bg-secondary-container text-on-secondary-container',
    shipped:    'bg-surface-container-highest text-on-surface-variant',
    delivered:  'bg-bid-green/10 text-bid-green',
    cancelled:  'bg-error-container text-on-error-container',
};

const getStatusBadge = (status: string) =>
    ORDER_STATUS_STYLES[(status as OrderStatus)] ?? 'bg-surface-container text-on-surface-variant';

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
    label: string;
    value: string;
    icon: string;
    iconColor: string;
    delta?: number | null;
    deltaLabel?: string;
    accent?: boolean;
}

function KpiCard({ label, value, icon, iconColor, delta, deltaLabel, accent }: KpiCardProps) {
    return (
        <div className={`bg-surface-container-lowest p-6 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 group${accent ? ' border-l-4 border-primary-container' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant leading-tight max-w-[140px]">
                    {label}
                </span>
                <span className={`material-symbols-outlined text-xl ${iconColor}`}>{icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-on-surface">{value}</span>
                {delta != null && (
                    <span className={`text-xs font-bold ${delta >= 0 ? 'text-bid-green' : 'text-bid-red'}`}>
                        {delta >= 0 ? '+' : ''}{delta}%
                    </span>
                )}
                {deltaLabel && (
                    <span className="text-xs text-on-surface-variant opacity-70">{deltaLabel}</span>
                )}
            </div>
        </div>
    );
}

// ─── Chart placeholder bar ───────────────────────────────────────────────────
const CHART_BARS = [
    { h: '60%', active: false },
    { h: '45%', active: false },
    { h: '80%', active: false },
    { h: '95%', active: true  },
    { h: '55%', active: false },
    { h: '70%', active: false },
    { h: '85%', active: false },
];
const CHART_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Main Component ───────────────────────────────────────────────────────────
const EcommerceDashboard = () => {
    const dispatch = useDispatch();
    const [activePeriod, setActivePeriod] = useState<'7d' | '30d' | '90d'>('7d');
    const { formatDisplayPrice, baseCurrency, currency } = useCurrency();

    useEffect(() => {
        dispatch(setPageTitle('Seller Dashboard'));
    }, [dispatch]);

    // ── Data fetching (SWR — unchanged) ──────────────────────────────────────
    // TODO: wire to API — replace stub URLs with real endpoints when ready
    const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
        '/dashboard/stats/',
        fetcher,
        { refreshInterval: 30000 }
    );

    const { data: recentOrders, isLoading: ordersLoading } = useSWR<RecentOrder[]>(
        '/dashboard/recent-orders/',
        fetcher
    );

    const { data: topProducts, isLoading: productsLoading } = useSWR<TopProduct[]>(
        '/dashboard/top-products/',
        fetcher
    );

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <IconLoader className="w-10 h-10 animate-spin text-primary-container" />
            </div>
        );
    }

    // ── Fallback values ────────────────────────────────────────────────────
    const gmv            = stats?.total_revenue        ?? 42910;
    const gmvGrowth      = stats?.revenue_growth       ?? 12.5;
    const activeListings = stats?.total_products       ?? 184;
    const pendingOrders  = stats?.pending_orders       ?? 23;
    const unreadMessages = 12; // TODO: wire to API — no messages endpoint yet
    const payoutBalance  = 12450.80; // TODO: wire to API — payout endpoint TBD

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-20 md:pb-12">

            {/* ── Currency Context Strip ──────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-bold">
                    <span className="material-symbols-outlined text-sm">savings</span>
                    Base · {baseCurrency}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container/10 text-primary-container font-bold">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Viewing · {currency}
                </span>
                {currency !== baseCurrency && (
                    <span className="text-on-surface-variant opacity-70 normal-case tracking-normal">
                        Amounts are converted from <strong>{baseCurrency}</strong> for display.
                    </span>
                )}
            </div>

            {/* ── KPI Bar ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    label="Gross Merchandise Value"
                    value={formatDisplayPrice(gmv)}
                    icon="trending_up"
                    iconColor="text-bid-green"
                    delta={gmvGrowth}
                />
                <KpiCard
                    label="Active Listings"
                    value={activeListings.toString()}
                    icon="layers"
                    iconColor="text-primary-container"
                    deltaLabel="Items"
                />
                <KpiCard
                    label="Pending Orders"
                    value={pendingOrders.toString()}
                    icon="local_shipping"
                    iconColor="text-tertiary"
                    deltaLabel={`Priority: ${stats?.low_stock_items ?? 4}`}
                />
                <KpiCard
                    label="Unread Messages"
                    value={unreadMessages.toString()}
                    icon="chat_bubble"
                    iconColor="text-primary-container"
                    accent
                />
            </div>

            {/* ── Charts Row ──────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Sales Performance chart (2/3) */}
                {/* TODO: chart — replace mock bars with a real chart library when approved */}
                <div className="lg:w-2/3 bg-surface-container-lowest rounded-xl shadow-card p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <div>
                            <h3 className="font-headline font-bold text-xl text-on-surface">Sales Performance</h3>
                            <p className="text-sm text-on-surface-variant opacity-70">Revenue trajectory over time</p>
                        </div>
                        <div className="flex bg-surface-container-low p-1 rounded-lg">
                            {(['7d', '30d', '90d'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setActivePeriod(p)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all active:scale-95 ${
                                        activePeriod === p
                                            ? 'bg-white text-primary-container shadow-sm'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Mock bar chart — TODO: chart */}
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {CHART_BARS.map((bar, i) => (
                            <div
                                key={i}
                                className={`w-full rounded-t-lg transition-all ${
                                    bar.active
                                        ? 'bg-primary-container shadow-lg'
                                        : 'bg-surface-container-high hover:bg-primary-container/20'
                                }`}
                                style={{ height: bar.h }}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 font-bold px-2">
                        {CHART_LABELS.map((l) => <span key={l}>{l}</span>)}
                    </div>
                </div>

                {/* Payout Balance (1/3) */}
                <div className="lg:w-1/3 bg-on-background text-white rounded-xl shadow-card overflow-hidden relative p-8 flex flex-col justify-between">
                    {/* Decorative glows */}
                    <div className="absolute -right-8 -top-8 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-k-secondary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Available Balance</span>
                            <span className="material-symbols-outlined text-secondary-fixed">account_balance_wallet</span>
                        </div>
                        <div className="space-y-1">
                            {/* TODO: wire to API — payout balance */}
                            <span className="font-mono text-4xl font-bold">{formatDisplayPrice(payoutBalance)}</span>
                            <p className="text-sm opacity-50">Next payout scheduled: Oct 24, 2023</p>
                        </div>
                    </div>

                    <div className="mt-8 relative z-10 space-y-4">
                        {/* TODO: wire to API — withdraw action */}
                        {/* bg-k-secondary = Kinetic bid-green family (#006c4b) */}
                        <button className="w-full bg-k-secondary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-secondary-fixed-dim transition-colors active:scale-95">
                            <span className="material-symbols-outlined">payments</span>
                            Withdraw Funds
                        </button>
                        <Link
                            to="/admin/revenue/transactions"
                            className="block text-center text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                            View Payout History
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Recent Orders Table ──────────────────────────────────────── */}
            <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
                <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                    <h3 className="font-headline font-bold text-xl text-on-surface">Recent Orders</h3>
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
                                {['Order ID', 'Product', 'Status', 'Date', 'Amount'].map((h) => (
                                    <th key={h} className="px-6 py-4 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                            {ordersLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center">
                                        <IconLoader className="w-6 h-6 animate-spin mx-auto text-primary-container" />
                                    </td>
                                </tr>
                            ) : recentOrders && recentOrders.length > 0 ? (
                                recentOrders.slice(0, 5).map((order) => (
                                    <tr key={order.id} className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-on-surface whitespace-nowrap">
                                            #{order.order_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-sm text-on-surface">{order.customer_name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-on-surface whitespace-nowrap">
                                            {formatDisplayPrice(order.total_amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                /* Stitch static fallback rows — TODO: wire to API */
                                <>
                                    <tr className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-on-surface">#TRH-8291</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-surface-container overflow-hidden flex-shrink-0">
                                                    <img
                                                        loading="lazy"
                                                        className="w-full h-full object-cover"
                                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4UOpDCXPGz9cZzrE-LiRhgoLahA_bK3-588C5ErpnhaNGEbNh1IU3yv6IEhcbh9lQlY_cmbGP7qVQBO19n2a7e-1Y4efJYiu4sjRHiYmJsZsmhRqiFummMZ7BV595o3qnD-yDeKhli9RXwCM4dhnmHSt9fRDYjnTonSZ_xwakVvuipr0Pm6Mw-VIXsIfIx5KGh76FJEuzjX3FMsmCxYAjNfn-Pruc4UwMsjJcrZUmrqOKeVCZpDtC2NdNfCECftGF04fZoc25KmI"
                                                        alt="Titanium Chronograph"
                                                    />
                                                </div>
                                                <span className="font-medium text-sm text-on-surface">Titanium Chronograph</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container uppercase">Processing</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 18, 2023</td>
                                        <td className="px-6 py-4 font-mono font-bold text-on-surface">{formatDisplayPrice(599, 'USD')}</td>
                                    </tr>
                                    <tr className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-on-surface">#TRH-8290</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-surface-container overflow-hidden flex-shrink-0">
                                                    <img
                                                        loading="lazy"
                                                        className="w-full h-full object-cover"
                                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOsrZzV7aB30nx5fRNE7azc4Mn8LFqbe2-YSrTLyIsFi-OytD-4iyp8B1jI2uRd3rxFtwNcjxGjDnoy7fbHDfb1yMYyfmr5RF_o_W_aPtuR_B7F9UPfmlm-NLJx6y4G2vmDpct8BF0NFQAyVDxAb1fWsKT7jRRpU9zb76mE6HO98TO_1hHhOseXF3zZOGMjerTIG9gWZzga80Eg8Hl3wNI_uoJPWwXfkQbkTtaXgwEwjX4Af4em8U_uF_bOH0cHr_H851h_MioRgw"
                                                        alt="Studio ANC Headphones"
                                                    />
                                                </div>
                                                <span className="font-medium text-sm text-on-surface">Studio ANC Headphones</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface-variant uppercase tracking-wider">Shipped</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 17, 2023</td>
                                        <td className="px-6 py-4 font-mono font-bold text-on-surface">{formatDisplayPrice(249.5, 'USD')}</td>
                                    </tr>
                                    <tr className="hover:bg-surface-container-low/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-on-surface">#TRH-8288</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-surface-container overflow-hidden flex-shrink-0">
                                                    <img
                                                        loading="lazy"
                                                        className="w-full h-full object-cover"
                                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjA_-2HMV3R22pyN2115fm_3PnAGQ_VkvjJV_2VpIg2Z_i0IOs39fP5vj2Qzw4WnZba-c1Y51Ci6UvTjAXHcJDvHZgYurXsY-80Hto4DNAAQE7tScoOgn3ksZECL2tDJ9zAV4IL4_mHEcEIXyc6yZL_oHQ6Rsbzlh9zMtccLbRDBUNQjycq45iOkUwaCg33h019gl7R91ciuAc6k-UcmaE_cn_YeYKcoQ8HRA-HcCmpseVom_MRsT7Q0ijHdb690ZYUFLL8-_HghY"
                                                        alt="Velocity Sport Runner"
                                                    />
                                                </div>
                                                <span className="font-medium text-sm text-on-surface">Velocity Sport Runner</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-error-container text-on-error-container uppercase">Refunded</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 16, 2023</td>
                                        <td className="px-6 py-4 font-mono font-bold text-on-surface">{formatDisplayPrice(120, 'USD')}</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Top Products ─────────────────────────────────────────────── */}
            {/* TODO: wire to API — top products endpoint */}
            {(productsLoading || (topProducts && topProducts.length > 0)) && (
                <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
                    <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                        <h3 className="font-headline font-bold text-xl text-on-surface">Top Products</h3>
                        <Link
                            to="/admin/products/list"
                            className="text-primary-container text-sm font-bold flex items-center gap-1 hover:underline active:scale-95 transition-transform"
                        >
                            View All
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </Link>
                    </div>
                    <div className="divide-y divide-outline-variant/10">
                        {productsLoading ? (
                            <div className="p-6 text-center">
                                <IconLoader className="w-6 h-6 animate-spin mx-auto text-primary-container" />
                            </div>
                        ) : topProducts?.slice(0, 5).map((product, index) => (
                            <Link
                                key={product.id}
                                to={`/admin/products/${product.id}`}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low/30 transition-colors"
                            >
                                <span className="font-mono text-sm text-on-surface-variant w-5 text-right flex-shrink-0">{index + 1}</span>
                                <div className="w-10 h-10 rounded-md bg-surface-container flex-shrink-0 overflow-hidden">
                                    {product.image ? (
                                        <img loading="lazy" src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-on-surface-variant">inventory_2</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-on-surface truncate">{product.name}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">{product.sales_count} sales</p>
                                </div>
                                <span className="font-mono font-bold text-on-surface whitespace-nowrap">{formatDisplayPrice(product.revenue)}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Alerts ──────────────────────────────────────────────────── */}
            {((stats?.pending_orders ?? 0) > 0 || (stats?.low_stock_items ?? 0) > 0 || (stats?.out_of_stock_items ?? 0) > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(stats?.pending_orders ?? 0) > 0 && (
                        <Link
                            to="/admin/orders/pending"
                            className="bg-bid-amber/5 border border-bid-amber/20 p-4 rounded-xl hover:bg-bid-amber/10 transition-colors flex items-center gap-3 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-bid-amber">schedule</span>
                            <div>
                                <p className="font-bold text-on-surface text-sm">{stats?.pending_orders} Pending Orders</p>
                                <p className="text-xs text-on-surface-variant">Requires attention</p>
                            </div>
                        </Link>
                    )}
                    {(stats?.low_stock_items ?? 0) > 0 && (
                        <Link
                            to="/admin/inventory/low-stock"
                            className="bg-bid-amber/5 border border-bid-amber/20 p-4 rounded-xl hover:bg-bid-amber/10 transition-colors flex items-center gap-3 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-bid-amber">inventory_2</span>
                            <div>
                                <p className="font-bold text-on-surface text-sm">{stats?.low_stock_items} Low Stock Items</p>
                                <p className="text-xs text-on-surface-variant">Restock needed</p>
                            </div>
                        </Link>
                    )}
                    {(stats?.out_of_stock_items ?? 0) > 0 && (
                        <Link
                            to="/admin/inventory/stock"
                            className="bg-bid-red/5 border border-bid-red/20 p-4 rounded-xl hover:bg-bid-red/10 transition-colors flex items-center gap-3 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-bid-red">warning</span>
                            <div>
                                <p className="font-bold text-on-surface text-sm">{stats?.out_of_stock_items} Out of Stock</p>
                                <p className="text-xs text-on-surface-variant">Urgent action required</p>
                            </div>
                        </Link>
                    )}
                </div>
            )}

            {/* ── Listing Health Alert ─────────────────────────────────────── */}
            {/* TODO: wire to API — listing health endpoint */}
            <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-tertiary">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-tertiary/10 p-2 rounded-lg text-tertiary flex-shrink-0">
                            <span className="material-symbols-outlined">health_metrics</span>
                        </div>
                        <div>
                            <h4 className="font-headline font-bold text-on-surface">Listing Health Update</h4>
                            <p className="text-sm text-on-surface-variant mt-1">
                                4 listings have low-quality images and may be suppressed from search results soon. Optimization recommended.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/admin/products/list"
                        className="bg-surface-container-lowest text-tertiary border border-tertiary/20 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-tertiary hover:text-white transition-all active:scale-95 whitespace-nowrap"
                    >
                        Review Listings
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default EcommerceDashboard;
