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

    // Normalize a value to lowercase string array (supports array of strings/objects or comma-separated string)
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

    // Derive user groups and global-admin bypass from auth state
    // Extract user ID - handle both nested (authUser.user.id) and direct (authUser.id) structures
    const userId = authUser?.user?.id || authUser?.id || (authUser && typeof authUser === 'object' && 'id' in authUser ? authUser.id : null);
    
    const{ data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useSWR(
        userId ? `/users/${userId}/profile/` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
        }
    );
    const userGroups = toLowerStringArray(userProfile?.groups || []);
    const userTypeLc = (userProfile?.user_type || userProfile?.role || '').toString().toLowerCase();
    const isGlobalAdmin = userGroups.includes('super admins') || userTypeLc === 'super_admin';

    // Helper to check if a menu item is allowed
    const isAllowed = (allowedGroups?: string[]) => {
        if (!allowedGroups || allowedGroups.length === 0) return true;
        if (isGlobalAdmin) return true;
        const allowed = allowedGroups.map((g) => g.toLowerCase());
        return userGroups.some((g) => allowed.includes(g));
    };

    const menuItems = [
        { path: '/admin/dashboard', icon: IconLayoutDashboard, label: 'Dashboard', allowedGroups: ['Administrators', 'Finance Officers', 'Inventory Managers', 'Support'] },
        {
            path: '/admin/products',
            icon: IconClipboardList,
            label: 'Products',
            allowedGroups: ['Administrators', 'Inventory Managers'],
            subItems: [
                { path: '/admin/products/list', icon: IconClipboardList, label: 'All Products', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/products/new', icon: IconClipboardList, label: 'Add Product', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/categories', icon: IconClipboardList, label: 'Categories', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/brands', icon: IconClipboardList, label: 'Brands', allowedGroups: ['Administrators', 'Inventory Managers'] },
                { path: '/admin/search', icon: IconSearch, label: 'Search Ops', allowedGroups: ['Administrators', 'Inventory Managers'] },
                {
                    path: '/admin/merchandising/homepage',
                    icon: IconLayoutGrid,
                    label: 'Homepage merchandising',
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

    const isPathActive = (path: string) => {
        return location.pathname.startsWith(path);
    };

    const renderMenuItem = (item: any, isSubItem = false) => {
        // Filter item by allowedGroups
        if (!isAllowed(item.allowedGroups)) return null;

        const isActive = isPathActive(item.path);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedSections[item.path];
        const Icon = item.icon;

        if (!hasSubItems) {
            return (
                <li key={item.path} className="menu nav-item last:border-b-0">
                    <NavLink
                        to={item.path}
                        className={({ isActive: navActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isSubItem ? 'pl-8' : ''} ${
                                navActive || isActive
                                    ? 'text-primary-container font-bold border-r-4 border-primary-container bg-surface-container-low'
                                    : 'text-on-surface opacity-70 hover:opacity-100 hover:bg-surface-container-low'
                            }`
                        }
                    >
                        <Icon className="!w-5 !h-5 flex-shrink-0" />
                        <span className="text-sm">{item.label}</span>
                    </NavLink>
                </li>
            );
        }

        // Filter subitems
        const filteredSubItems = item.subItems.filter((subItem: any) => isAllowed(subItem.allowedGroups));
        if (!filteredSubItems.length) return null;

        return (
            <li key={item.path} className="menu nav-item last:border-b-0">
                <button
                    type="button"
                    className={`nav-link flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all duration-200 ${
                        isActive || isExpanded
                            ? 'text-primary-container font-bold bg-surface-container-low'
                            : 'text-on-surface opacity-70 hover:opacity-100 hover:bg-surface-container-low'
                    }`}
                    onClick={() => toggleMenu(item.path)}
                >
                    <Icon className="!w-5 !h-5 flex-shrink-0" />
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    <IconChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rtl:rotate-180'}`} />
                </button>

                {isExpanded && (
                    <ul className="sub-menu bg-surface-container-low/30 rounded-lg mt-0.5">
                        {filteredSubItems.map((subItem: any) => renderMenuItem(subItem, true))}
                    </ul>
                )}
            </li>
        );
    };

    // Show loading state while user profile is being fetched
    // if (userProfileLoading || !authUser?.user?.id) {
    //     return (
    //         <div className={semidark ? 'dark' : ''}>
    //             <nav className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] sm:w-[280px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300`}>
    //                 <div className="bg-primary dark:bg-primary h-full flex flex-col">
    //                     <div className="flex justify-between items-center px-3 py-2">
    //                         <NavLink to="/" className="main-logo flex items-center shrink-0">
    //                             <img className="w-[160px] sm:w-[180px] ml-[5px] flex-none" src="/assets/images/tradehut-text.png" alt="TradeHut Logo" />
    //                         </NavLink>
    //                     </div>
    //                     <div className="flex-1 flex items-center justify-center">
    //                         <div className="text-white text-sm">Loading...</div>
    //                     </div>
    //                 </div>
    //             </nav>
    //         </div>
    //     );
    // }

    return (
        <div className={semidark ? 'dark' : ''}>
            {/* ── Kinetic sidebar shell ─────────────────────────────────────────────
                Visual treatment updated to Kinetic tokens.
                Route list, NavLink targets, toggleSidebar logic — all UNCHANGED.
            ──────────────────────────────────────────────────────────────────── */}
            <nav className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] sm:w-[280px] z-50 transition-all duration-300 shadow-card`}>
                <div className="bg-surface dark:bg-[#1a1a1a] h-full flex flex-col border-r border-outline-variant/10">

                    {/* ── Brand + collapse toggle ── */}
                    <div className="flex justify-between items-center px-4 py-4 border-b border-outline-variant/10">
                        <NavLink to="/" className="main-logo flex items-center shrink-0 gap-2">
                            <img
                                className="w-[100px] sm:w-[110px] flex-none"
                                src="/assets/images/logos/tradehutfullText.png"
                                alt="TradeHut Logo"
                                loading="lazy"
                            />
                        </NavLink>
                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container-low transition-colors duration-200 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconMenu2 className="w-5 h-5 text-on-surface-variant" />
                        </button>
                    </div>

                    {/* ── Identity card ── */}
                    <div className="px-4 py-3 border-b border-outline-variant/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0">
                                <IconUser className="w-5 h-5 text-on-surface-variant" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">
                                    {userProfile?.name || userProfile?.email || authUser?.user?.name || authUser?.user?.email || 'Admin User'}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 truncate">
                                    {userProfile?.user_type || authUser?.user?.user_type || 'Administrator'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Nav links ── */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <PerfectScrollbar className="flex-1">
                            <ul className="relative space-y-0.5 p-3 py-2 text-base">
                                {menuItems.map((item) => renderMenuItem(item))}
                            </ul>
                        </PerfectScrollbar>

                        {/* ── Logout ── */}
                        <div className="p-3 border-t border-outline-variant/10 mt-auto">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('userRole');
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('token');
                                    window.location.href = '/login';
                                }}
                                className="flex items-center w-full px-3 py-2 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface rounded-lg transition-colors duration-200 active:scale-95"
                            >
                                <IconLogout className="w-5 h-5 flex-shrink-0" />
                                <span className="ml-2 text-sm font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
