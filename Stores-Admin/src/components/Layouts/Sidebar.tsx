import {
    Bell,
    BadgePercent,
    ChevronRight,
    ClipboardList,
    CreditCard,
    DollarSign,
    Gavel,
    Headphones,
    History,
    LayoutDashboard,
    LayoutGrid,
    LogOut,
    Megaphone,
    MessageSquareQuote,
    Package,
    ReceiptText,
    Search,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Star,
    Store,
    Truck,
    Users,
    Wallet,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import useSignOut from 'react-auth-kit/hooks/useSignOut';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/shadcn/sheet';
import { Skeleton } from '@/components/shadcn/skeleton';
import { cn } from '@/lib/utils';
import useMediaQuery from '@/hooks/useMediaQuery';
import { useUserAccess } from '@/pages/seller/hooks/useUserAccess';
import { AppDispatch, IRootState } from '../../store';
import { LogoutUser } from '../../store/authSlice';
import { toggleSidebar } from '../../store/themeConfigSlice';

interface MenuItem {
    path: string;
    icon: LucideIcon;
    label: string;
    allowedGroups?: string[];
    subItems?: MenuItem[];
}

const SELLER_MENU: MenuItem[] = [
    { path: '/seller/overview', icon: LayoutDashboard, label: 'Overview' },
    { path: '/seller/listings', icon: Package, label: 'Listings' },
    { path: '/seller/orders', icon: ReceiptText, label: 'Orders' },
    { path: '/seller/auctions', icon: Gavel, label: 'Auctions' },
    { path: '/seller/rfq', icon: MessageSquareQuote, label: 'RFQ' },
    { path: '/seller/payouts', icon: Wallet, label: 'Payouts' },
    { path: '/seller/disputes', icon: ShieldAlert, label: 'Disputes' },
    { path: '/seller/settings', icon: Settings, label: 'Settings' },
];

const ADMIN_MENU: MenuItem[] = [
    {
        path: '/admin/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        allowedGroups: ['Administrators', 'Finance Officers', 'Inventory Managers', 'Support'],
    },
    {
        path: '/admin/products',
        icon: ClipboardList,
        label: 'Products',
        allowedGroups: ['Administrators', 'Inventory Managers'],
        subItems: [
            { path: '/admin/products/list', icon: ClipboardList, label: 'All Products', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/products/new', icon: ClipboardList, label: 'Add Product', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/catalog', icon: ClipboardList, label: 'Catalog', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/search', icon: Search, label: 'Search Ops', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/merchandising/homepage', icon: LayoutGrid, label: 'Homepage Merchandising', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/ads', icon: Megaphone, label: 'Ads & Promotions', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/promos', icon: BadgePercent, label: 'Promo Codes', allowedGroups: ['Administrators', 'Inventory Managers'] },
        ],
    },
    {
        path: '/admin/orders',
        icon: Truck,
        label: 'Orders',
        allowedGroups: ['Administrators', 'Order Managers'],
        subItems: [
            { path: '/admin/orders/list', icon: ClipboardList, label: 'All Orders', allowedGroups: ['Administrators', 'Order Managers'] },
            { path: '/admin/orders/pending', icon: ClipboardList, label: 'Pending Orders', allowedGroups: ['Administrators', 'Order Managers'] },
            { path: '/admin/orders/completed', icon: ClipboardList, label: 'Completed Orders', allowedGroups: ['Administrators', 'Order Managers'] },
        ],
    },
    {
        path: '/admin/users',
        icon: Users,
        label: 'User Management',
        allowedGroups: ['Administrators'],
        subItems: [
            { path: '/admin/users/list', icon: Users, label: 'All Users', allowedGroups: ['Administrators'] },
            { path: '/admin/users/roles', icon: ShieldCheck, label: 'User Roles', allowedGroups: ['Administrators'] },
        ],
    },
    {
        path: '/admin/customers',
        icon: Users,
        label: 'Customers',
        allowedGroups: ['Administrators'],
        subItems: [
            { path: '/admin/customers/list', icon: Users, label: 'All Customers', allowedGroups: ['Administrators'] },
            { path: '/admin/customers/new', icon: Users, label: 'Add Customer', allowedGroups: ['Administrators'] },
        ],
    },
    {
        path: '/admin/sellers',
        icon: Store,
        label: 'Sellers',
        allowedGroups: ['Administrators'],
        subItems: [
            { path: '/admin/sellers/list', icon: Store, label: 'All Sellers', allowedGroups: ['Administrators'] },
            { path: '/admin/sellers/new', icon: Store, label: 'Add Seller', allowedGroups: ['Administrators'] },
        ],
    },
    {
        path: '/admin/inventory',
        icon: Wrench,
        label: 'Inventory',
        allowedGroups: ['Administrators', 'Inventory Managers'],
        subItems: [
            { path: '/admin/inventory/stock', icon: Wrench, label: 'Stock Management', allowedGroups: ['Administrators', 'Inventory Managers'] },
            { path: '/admin/inventory/low-stock', icon: Wrench, label: 'Low Stock Alerts', allowedGroups: ['Administrators', 'Inventory Managers'] },
        ],
    },
    { path: '/admin/reviews', icon: Star, label: 'Reviews & Ratings', allowedGroups: ['Administrators'] },
    {
        path: '/admin/revenue',
        icon: DollarSign,
        label: 'Revenue & Finance',
        allowedGroups: ['Administrators', 'Finance Officers'],
        subItems: [
            { path: '/admin/revenue/overview', icon: Wallet, label: 'Revenue Overview', allowedGroups: ['Administrators', 'Finance Officers'] },
            { path: '/admin/revenue/transactions', icon: CreditCard, label: 'Transactions', allowedGroups: ['Administrators', 'Finance Officers'] },
            { path: '/admin/revenue/refunds', icon: CreditCard, label: 'Refunds', allowedGroups: ['Administrators', 'Finance Officers'] },
        ],
    },
    { path: '/admin/notifications', icon: Bell, label: 'Notifications', allowedGroups: ['Administrators'] },
    {
        path: '/admin/support',
        icon: Headphones,
        label: 'Support',
        allowedGroups: ['Administrators', 'Support'],
        subItems: [
            { path: '/admin/support/tickets', icon: Headphones, label: 'Support Tickets', allowedGroups: ['Administrators', 'Support'] },
            { path: '/admin/support/disputes', icon: Gavel, label: 'Disputes', allowedGroups: ['Administrators', 'Support'] },
        ],
    },
    { path: '/admin/audit-trail', icon: History, label: 'Audit Trail', allowedGroups: ['Administrators'] },
    { path: '/admin/configurations', icon: Settings, label: 'Settings', allowedGroups: ['Administrators'] },
];

const Sidebar = () => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = themeConfig.semidark;
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch: AppDispatch = useDispatch();
    const signOut = useSignOut();
    const isMobile = useMediaQuery('(max-width: 1023px)');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const { profile, groups, isSeller, isResolving } = useUserAccess();

    // Close the mobile sheet after navigating.
    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const userTypeLc = String(profile?.user_type || profile?.role || '').toLowerCase();
    const isGlobalAdmin = groups.includes('super admins') || userTypeLc === 'super_admin';

    const isAllowed = (allowedGroups?: string[]) => {
        if (!allowedGroups || allowedGroups.length === 0) return true;
        if (isGlobalAdmin) return true;
        const allowed = allowedGroups.map((g) => g.toLowerCase());
        return groups.some((g) => allowed.includes(g));
    };

    const adminItems = ADMIN_MENU.filter((item) => isAllowed(item.allowedGroups));
    const isPathActive = (path: string) => location.pathname.startsWith(path);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await dispatch(LogoutUser({ signOut }));
        } catch {
            // The client-side sign-out below runs regardless of the server response.
        } finally {
            signOut();
            localStorage.clear();
            sessionStorage.clear();
            navigate('/login', { replace: true });
            setIsLoggingOut(false);
        }
    };

    const linkClass = (active: boolean, sub = false) =>
        cn(
            'group flex items-center gap-2.5 rounded-md text-sm transition-colors',
            sub ? 'py-1.5 pl-8 pr-2.5 font-medium' : 'px-2.5 py-2 font-semibold',
            active ? 'bg-primary-subtle text-primary-subtle-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        );

    const renderItem = (item: MenuItem, sub = false) => {
        const Icon = item.icon;
        const active = isPathActive(item.path);
        const children = item.subItems?.filter((s) => isAllowed(s.allowedGroups));

        if (!item.subItems) {
            return (
                <li key={item.path}>
                    <NavLink to={item.path} className={linkClass(active, sub)}>
                        {sub ? null : <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        <span className="truncate">{item.label}</span>
                    </NavLink>
                </li>
            );
        }

        if (!children || children.length === 0) return null;
        const expanded = expandedSections[item.path] ?? active;

        return (
            <li key={item.path}>
                <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedSections((prev) => ({ ...prev, [item.path]: !expanded }))}
                    className={cn(linkClass(active && !expanded), 'w-full')}
                >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200 rtl:rotate-180', expanded && 'rotate-90 rtl:rotate-90')} aria-hidden="true" />
                </button>
                {expanded ? <ul className="ml-4 space-y-0.5 border-l border-border py-0.5">{children.map((child) => renderItem(child, true))}</ul> : null}
            </li>
        );
    };

    const sectionLabel = (text: string) => <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{text}</p>;

    const displayName = profile?.name || profile?.full_name || profile?.email || 'Account';
    const displayRole = isSeller ? 'Seller' : String(profile?.user_type || '').replace(/_/g, ' ') || 'Staff';
    const displayInitial = String(displayName).charAt(0).toUpperCase();

    const body = (
        <div className="flex h-full flex-col border-r border-border bg-background text-foreground">
            <div className="flex items-center px-4 py-3 pr-12 lg:pr-4">
                <NavLink to={isSeller ? '/seller/overview' : '/'} className="flex shrink-0 items-center">
                    <img src="/assets/images/logos/tradehutfullText.png" alt="TradeHut" className="w-24 flex-none sm:w-28" loading="lazy" />
                </NavLink>
            </div>

            <div className="flex items-center gap-2.5 border-y border-border px-4 py-2.5">
                <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-subtle text-xs font-bold text-primary-subtle-foreground">{displayInitial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
                    <p className="truncate text-[11px] font-medium capitalize text-muted-foreground">{displayRole}</p>
                </div>
            </div>

            <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {isResolving ? (
                    <div className="space-y-2 px-1" aria-busy="true" aria-label="Loading menu">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                ) : (
                    <>
                        {isSeller ? (
                            <>
                                {adminItems.length > 0 ? sectionLabel('Seller') : null}
                                <ul className="space-y-0.5">{SELLER_MENU.map((item) => renderItem(item))}</ul>
                            </>
                        ) : null}
                        {adminItems.length > 0 ? (
                            <>
                                {isSeller ? sectionLabel('Admin') : null}
                                <ul className="space-y-0.5">{adminItems.map((item) => renderItem(item))}</ul>
                            </>
                        ) : null}
                    </>
                )}
            </nav>

            <div className="border-t border-border p-2">
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive-subtle hover:text-destructive-subtle-foreground disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className={semidark ? 'dark' : ''}>
            {/* Desktop: fixed rail. Hidden below lg, where the same content opens in a sheet. */}
            <aside className="sidebar fixed bottom-0 left-0 top-0 z-50 w-[290px] transition-all duration-300 max-lg:hidden">{body}</aside>

            {isMobile ? (
                <Sheet
                    open={themeConfig.sidebar}
                    onOpenChange={(open) => {
                        if (!open && themeConfig.sidebar) dispatch(toggleSidebar());
                    }}
                >
                    <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 sm:max-w-[280px]">
                        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                        <SheetDescription className="sr-only">Links to the sections of your dashboard</SheetDescription>
                        {body}
                    </SheetContent>
                </Sheet>
            ) : null}
        </div>
    );
};

export default Sidebar;
