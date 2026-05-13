import {
    IconChevronRight,
    IconClipboardList,
    IconCurrencyDollar,
    IconHammer,
    IconLayoutDashboard,
    IconLogout,
    IconMenu2,
    IconMoneybag,
    IconSettings,
    IconShieldLock,
    IconStar,
    IconTruck,
    IconUser,
    IconUsers,
    IconHistory,
    IconBell,
    IconGavel,
    IconHeadphones,
    IconCreditCard,
    IconBuildingStore,
    IconSearch,
    IconLayoutGrid,
    IconSpeakerphone,
    IconDiscount2,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { IRootState } from '../../store';
import { toggleSidebar } from '../../store/themeConfigSlice';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';

const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
    const authUser: any = useAuthUser();

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    const toggleMenu = (path: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [path]: !prev[path],
        }));
    };

    const toLowerStringArray = (input: any): string[] => {
        if (!input) return [];
        if (Array.isArray(input)) {
            return input
                .map((item) => {
                    if (typeof item === 'string') return item.toLowerCase();
                    if (item && typeof item === 'object') {
                        const name = (item.name || item.role || item.group || item.title || '').toString();
                        return name.toLowerCase();
                    }
                    return '';
                })
                .filter(Boolean);
        }
        if (typeof input === 'string') {
            return input
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
        }
        return [];
    };

    const userId =
        authUser?.user?.id ||
        authUser?.id ||
        (authUser && typeof authUser === 'object' && 'id' in authUser ? authUser.id : null);

    const { data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useSWR(
        userId ? `/users/${userId}/profile/` : null,
        fetcher,
        { revalidateOnFocus: false, keepPreviousData: true }
    );

    const userGroups = toLowerStringArray(userProfile?.groups || []);
    const userTypeLc = (userProfile?.user_type || userProfile?.role || '').toString().toLowerCase();
    const isGlobalAdmin = userGroups.includes('super admins') || userTypeLc === 'super_admin';

    const isAllowed = (allowedGroups?: string[]) => {
        if (!allowedGroups || allowedGroups.length === 0) return true;
        if (isGlobalAdmin) return true;
        const allowed = allowedGroups.map((g) => g.toLowerCase());
        return userGroups.some((g) => allowed.includes(g));
    };

    const menuItems = [
        {
            path: '/admin/dashboard',
            icon: IconLayoutDashboard,
            label: 'Dashboard',
            allowedGroups: ['Administrators', 'Finance Officers', 'Inventory Managers', 'Support'],
        },
        {
            path: '/admin/products',
            icon: IconClipboardList,
            label: 'Products',
            allowedGroups: ['Administrators', 'Inventory Managers'],
            subItems: [
                { path: '/admin/products/list', icon: IconClipboardList, label: 'All Products', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/products/new', icon: IconClipboardList, label: 'Add Product', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/catalog', icon: IconClipboardList, label: 'Catalog', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/search', icon: IconSearch, label: 'Search Ops', allowedGroups: ['Administrators', 'Inventory Managers'] },
                {
                    path: '/admin/merchandising/homepage',
                    icon: IconLayoutGrid,
                    label: 'Homepage Merchandising',
                    allowedGroups: ['Administrators', 'Inventory Managers'],
                },
                {
                    path: '/admin/ads',
                    icon: IconSpeakerphone,
                    label: 'Ads & Promotions',
                    allowedGroups: ['Administrators', 'Inventory Managers'],
                },
                {
                    path: '/admin/promos',
                    icon: IconDiscount2,
                    label: 'Promo Codes',
                    allowedGroups: ['Administrators', 'Inventory Managers'],
                },
            ],
        },
        {
            path: '/admin/orders',
            icon: IconTruck,
            label: 'Orders',
            allowedGroups: ['Administrators', 'Order Managers'],
            subItems: [
                { path: '/admin/orders/list', icon: IconClipboardList, label: 'All Orders', allowedGroups: ['Administrators', 'Order Managers'] },
                { path: '/admin/orders/pending', icon: IconClipboardList, label: 'Pending Orders', allowedGroups: ['Administrators', 'Order Managers'] },
                { path: '/admin/orders/completed', icon: IconClipboardList, label: 'Completed Orders', allowedGroups: ['Administrators', 'Order Managers'] },
            ],
        },
        {
            path: '/admin/users',
            icon: IconUsers,
            label: 'User Management',
            allowedGroups: ['Administrators'],
            subItems: [
                { path: '/admin/users/list', icon: IconUsers, label: 'All Users', allowedGroups: ['Administrators'] },
                { path: '/admin/users/roles', icon: IconShieldLock, label: 'User Roles', allowedGroups: ['Administrators'] },
            ],
        },
        {
            path: '/admin/customers',
            icon: IconUsers,
            label: 'Customers',
            allowedGroups: ['Administrators'],
            subItems: [
                { path: '/admin/customers/list', icon: IconUsers, label: 'All Customers', allowedGroups: ['Administrators'] },
                { path: '/admin/customers/new', icon: IconUsers, label: 'Add Customer', allowedGroups: ['Administrators'] },
            ],
        },
        {
            path: '/admin/sellers',
            icon: IconBuildingStore,
            label: 'Sellers',
            allowedGroups: ['Administrators'],
            subItems: [
                { path: '/admin/sellers/list', icon: IconBuildingStore, label: 'All Sellers', allowedGroups: ['Administrators'] },
                { path: '/admin/sellers/new', icon: IconBuildingStore, label: 'Add Seller', allowedGroups: ['Administrators'] },
            ],
        },
        {
            path: '/admin/inventory',
            icon: IconHammer,
            label: 'Inventory',
            allowedGroups: ['Administrators', 'Inventory Managers'],
            subItems: [
                { path: '/admin/inventory/stock', icon: IconHammer, label: 'Stock Management', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/inventory/low-stock', icon: IconHammer, label: 'Low Stock Alerts', allowedGroups: ['Administrators', 'Inventory Managers'] },
            ],
        },
        { path: '/admin/reviews', icon: IconStar, label: 'Reviews & Ratings', allowedGroups: ['Administrators'] },
        {
            path: '/admin/revenue',
            icon: IconCurrencyDollar,
            label: 'Revenue & Finance',
            allowedGroups: ['Administrators', 'Finance Officers'],
            subItems: [
                { path: '/admin/revenue/overview', icon: IconMoneybag, label: 'Revenue Overview', allowedGroups: ['Administrators', 'Finance Officers'] },
                { path: '/admin/revenue/transactions', icon: IconCreditCard, label: 'Transactions', allowedGroups: ['Administrators', 'Finance Officers'] },
                { path: '/admin/revenue/refunds', icon: IconCreditCard, label: 'Refunds', allowedGroups: ['Administrators', 'Finance Officers'] },
            ],
        },
        { path: '/admin/notifications', icon: IconBell, label: 'Notifications', allowedGroups: ['Administrators'] },
        {
            path: '/admin/support',
            icon: IconHeadphones,
            label: 'Support',
            allowedGroups: ['Administrators', 'Support'],
            subItems: [
                { path: '/admin/support/tickets', icon: IconHeadphones, label: 'Support Tickets', allowedGroups: ['Administrators', 'Support'] },
                { path: '/admin/support/disputes', icon: IconGavel, label: 'Disputes', allowedGroups: ['Administrators', 'Support'] },
            ],
        },
        { path: '/admin/audit-trail', icon: IconHistory, label: 'Audit Trail', allowedGroups: ['Administrators'] },
        { path: '/admin/configurations', icon: IconSettings, label: 'Settings', allowedGroups: ['Administrators'] },
    ];

    const isPathActive = (path: string) => location.pathname.startsWith(path);

    const renderMenuItem = (item: any, isSubItem = false) => {
        if (!isAllowed(item.allowedGroups)) return null;

        const isActive = isPathActive(item.path);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedSections[item.path];
        const Icon = item.icon;

        // ── Leaf node ────────────────────────────────────────────────────────
        if (!hasSubItems) {
            return (
                <li key={item.path}>
                    <NavLink
                        to={item.path}
                        className={({ isActive: navActive }) =>
                            [
                                'group flex items-center gap-3 rounded-md transition-all duration-150',
                                isSubItem
                                    ? 'pl-9 pr-3 py-2 text-[11.5px] font-medium tracking-wide'
                                    : 'px-3 py-2.5 text-[12.5px] font-semibold tracking-wide',
                                navActive || isActive
                                    ? 'bg-primary-container/15 text-primary-container border-r-2 border-primary-container'
                                    : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-container-low/60',
                            ].join(' ')
                        }
                    >
                        <Icon
                            className={[
                                'flex-shrink-0 transition-colors duration-150',
                                isSubItem ? 'w-3.5 h-3.5' : 'w-4 h-4',
                                isActive ? 'text-primary-container' : 'text-on-surface/40 group-hover:text-on-surface/70',
                            ].join(' ')}
                        />
                        <span className="truncate">{item.label}</span>
                    </NavLink>
                </li>
            );
        }

        // ── Guard: no visible children ────────────────────────────────────────
        const filteredSubItems = item.subItems.filter((sub: any) => isAllowed(sub.allowedGroups));
        if (!filteredSubItems.length) return null;

        // ── Parent node ───────────────────────────────────────────────────────
        return (
            <li key={item.path}>
                <button
                    type="button"
                    onClick={() => toggleMenu(item.path)}
                    className={[
                        'group w-full flex items-center gap-3 px-3 py-2.5 rounded-md',
                        'text-[12.5px] font-semibold tracking-wide transition-all duration-150',
                        isActive || isExpanded
                            ? 'text-on-surface bg-surface-container-low/60'
                            : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-container-low/60',
                    ].join(' ')}
                >
                    <Icon
                        className={[
                            'w-4 h-4 flex-shrink-0 transition-colors duration-150',
                            isActive || isExpanded
                                ? 'text-primary-container'
                                : 'text-on-surface/40 group-hover:text-on-surface/70',
                        ].join(' ')}
                    />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <IconChevronRight
                        className={[
                            'w-3 h-3 flex-shrink-0 text-on-surface/30 transition-transform duration-200',
                            isExpanded ? 'rotate-90' : 'rtl:rotate-180',
                        ].join(' ')}
                    />
                </button>

                {/* Sub-menu — CSS height transition via max-height trick */}
                <ul
                    className={[
                        'overflow-hidden transition-all duration-200 ease-in-out',
                        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                    ].join(' ')}
                >
                    {/* Left rail accent */}
                    <div className="relative ml-[22px] border-l border-outline-variant/20 py-0.5">
                        {filteredSubItems.map((subItem: any) => renderMenuItem(subItem, true))}
                    </div>
                </ul>
            </li>
        );
    };

    // ── Derived display values (no new state) ─────────────────────────────────
    const displayName =
        userProfile?.name ||
        userProfile?.email ||
        authUser?.user?.name ||
        authUser?.user?.email ||
        'Admin User';

    const displayRole =
        userProfile?.user_type ||
        authUser?.user?.user_type ||
        'Administrator';

    const displayInitial = displayName.charAt(0).toUpperCase();

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav className="sidebar fixed top-0 bottom-0 left-0 w-[240px] sm:w-[256px] z-50 transition-all duration-300">
                <div className="bg-surface dark:bg-[#111] h-full flex flex-col border-r border-outline-variant/10">

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-outline-variant/10">
                        <NavLink to="/" className="flex items-center shrink-0">
                            <img
                                src="/assets/images/logos/tradehutfullText.png"
                                alt="TradeHut"
                                className="w-24 sm:w-28 flex-none"
                                loading="lazy"
                            />
                        </NavLink>
                        <button
                            type="button"
                            aria-label="Toggle sidebar"
                            onClick={() => dispatch(toggleSidebar())}
                            className="w-7 h-7 rounded-md flex items-center justify-center
                                       text-on-surface-variant hover:bg-surface-container-low
                                       transition-colors duration-150 rtl:rotate-180"
                        >
                            <IconMenu2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ── Identity card ──────────────────────────────────────── */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10">
                        {/* Avatar — initial-based, no image needed */}
                        <div className="w-8 h-8 rounded-md bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-container leading-none">
                                {displayInitial}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-on-surface leading-tight truncate">
                                {displayName}
                            </p>
                            <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-on-surface-variant/50 mt-0.5 truncate">
                                {displayRole}
                            </p>
                        </div>
                    </div>

                    {/* ── Navigation ─────────────────────────────────────────── */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <PerfectScrollbar className="flex-1 px-2 py-2">
                            <ul className="space-y-0.5">
                                {menuItems.map((item) => renderMenuItem(item))}
                            </ul>
                        </PerfectScrollbar>

                        {/* ── Logout ─────────────────────────────────────────── */}
                        <div className="px-2 py-2 border-t border-outline-variant/10">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('userRole');
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('token');
                                    window.location.href = '/login';
                                }}
                                className="group w-full flex items-center gap-3 px-3 py-2 rounded-md
                                           text-[12px] font-semibold tracking-wide
                                           text-on-surface-variant/50
                                           hover:text-on-surface hover:bg-surface-container-low/60
                                           transition-all duration-150 active:scale-[0.98]"
                            >
                                <IconLogout className="w-4 h-4 flex-shrink-0 group-hover:text-red-500 transition-colors duration-150" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>

                </div>
            </nav>
        </div>
    );
};

export default Sidebar;