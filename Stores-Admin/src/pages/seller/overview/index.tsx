import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { Banknote, Boxes, Clock, Gavel, MessageSquareQuote, Package, TrendingUp, Truck, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/shadcn/page-header';
import { StatCard } from '@/components/shadcn/stat-card';
import { setPageTitle } from '@/store/themeConfigSlice';
import {
    fetchRecentSellerOrders,
    fetchSellerBalance,
    fetchSellerStats,
    formatMoney,
    type Paginated,
    type SellerApiError,
    type SellerBalance,
    type SellerOrderRow,
    type SellerStats,
} from '@/services/sellerStatsService';
import { ErrorPanel } from '../components/ErrorPanel';
import { RecentOrders } from './RecentOrders';
import { SalesChart } from './SalesChart';

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

interface CardSpec {
    key: string;
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    to: string;
    loading: boolean;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

export default function SellerOverview() {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Seller overview'));
    }, [dispatch]);

    const stats = useSWR<SellerStats, SellerApiError>('seller:stats', fetchSellerStats, SWR_OPTIONS);
    const balance = useSWR<SellerBalance, SellerApiError>('seller:balance', fetchSellerBalance, SWR_OPTIONS);
    const recent = useSWR<Paginated<SellerOrderRow>, SellerApiError>('seller:recent-orders', () => fetchRecentSellerOrders(5), SWR_OPTIONS);

    const s = stats.data;
    const b = balance.data;
    const statsLoading = stats.isLoading;
    const balanceLoading = balance.isLoading;
    const dash = '-';

    const cards: CardSpec[] = [
        {
            key: 'sales',
            label: 'Sales, last 30 days',
            value: s ? formatMoney(s.sales_30d, s.currency) : dash,
            hint: s ? plural(s.orders_30d, 'order', 'orders') : undefined,
            icon: TrendingUp,
            to: '/seller/orders',
            loading: statsLoading,
        },
        {
            key: 'to-ship',
            label: 'Orders to ship',
            value: s ? s.orders_to_ship.toLocaleString() : dash,
            hint: 'Awaiting shipment',
            icon: Truck,
            to: '/seller/orders?status=Processing',
            loading: statsLoading,
        },
        {
            key: 'available',
            label: 'Available balance',
            value: b ? formatMoney(b.available, b.currency) : dash,
            hint: b ? `Minimum payout ${formatMoney(b.min_payout, b.currency)}` : undefined,
            icon: Banknote,
            to: '/seller/payouts',
            loading: balanceLoading,
        },
        {
            key: 'pending',
            label: 'Pending balance',
            value: b ? formatMoney(b.pending, b.currency) : dash,
            hint: 'Not yet withdrawable',
            icon: Clock,
            to: '/seller/payouts',
            loading: balanceLoading,
        },
        {
            key: 'low-stock',
            label: 'Low stock',
            value: s ? s.low_stock_variants.toLocaleString() : dash,
            hint: 'Variants with 5 or fewer left',
            icon: Boxes,
            to: '/seller/listings',
            loading: statsLoading,
        },
        {
            key: 'listings',
            label: 'Active listings',
            value: s ? s.active_listings.toLocaleString() : dash,
            icon: Package,
            to: '/seller/listings',
            loading: statsLoading,
        },
        {
            key: 'auctions',
            label: 'Live auctions',
            value: s ? s.live_auctions.toLocaleString() : dash,
            icon: Gavel,
            to: '/seller/auctions',
            loading: statsLoading,
        },
        {
            key: 'rfq',
            label: 'Open RFQ matches',
            value: s ? s.open_rfq_matches.toLocaleString() : dash,
            hint: 'Requests matching your categories',
            icon: MessageSquareQuote,
            to: '/seller/rfq',
            loading: statsLoading,
        },
    ];

    const statsError = stats.error;
    const balanceError = balance.error;
    const showBalanceError = balanceError && (!statsError || statsError.kind !== balanceError.kind);
    const series = s?.sales_by_day;

    return (
        <div className="space-y-3 pb-2">
            <PageHeader title="Overview" description="Your store at a glance" className="pb-0" />

            {statsError ? <ErrorPanel title="Couldn't load your store numbers" message={statsError.message} onRetry={() => void stats.mutate()} isRetrying={stats.isValidating} /> : null}
            {showBalanceError ? <ErrorPanel title="Couldn't load your balance" message={balanceError.message} onRetry={() => void balance.mutate()} isRetrying={balance.isValidating} /> : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                    <Link key={c.key} to={c.to} className="block rounded-lg transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <StatCard label={c.label} value={c.value} hint={c.hint} icon={c.icon} isLoading={c.loading} className="h-full" />
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                {s && series && series.length > 0 ? (
                    <div className="lg:col-span-3">
                        <SalesChart series={series} currency={s.currency} />
                    </div>
                ) : null}
                <div className={s && series && series.length > 0 ? 'lg:col-span-2' : 'lg:col-span-5'}>
                    <RecentOrders orders={recent.data?.results} isLoading={recent.isLoading} error={recent.error} onRetry={() => void recent.mutate()} isRetrying={recent.isValidating} />
                </div>
            </div>
        </div>
    );
}
