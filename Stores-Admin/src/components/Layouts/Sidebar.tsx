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
    const{ data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useSWR(`/users/${authUser?.user?.id}/profile/`, fetcher, {
        revalidateOnFocus: false,
        keepPreviousData: true,
    });
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
                <li key={item.path} className="menu nav-item border-secondary-dark last:border-b-0">
                    <NavLink to={item.path} className={`group hover:bg-secondary-light/10 ${isSubItem ? 'pl-6' : ''}`}>
                        <div className="flex items-center justify-between w-full py-1.5 px-3">
                            <div className="flex items-center">
                                <Icon className="!w-6 !h-6 !text-white" />
                                <span className="ltr:pl-2 rtl:pr-2 text-sm text-white">{item.label}</span>
                            </div>
                        </div>
                    </NavLink>
                </li>
            );
        }

        // Filter subitems
        const filteredSubItems = item.subItems.filter((subItem: any) => isAllowed(subItem.allowedGroups));
        if (!filteredSubItems.length) return null;

        return (
            <li key={item.path} className="menu nav-item border-secondary-dark last:border-b-0">
                <button type="button" className={`nav-link group w-full hover:bg-secondary-light/10 ${currentMenu === item.path ? 'active' : ''}`} onClick={() => toggleMenu(item.path)}>
                    <div className="flex items-center justify-between w-full py-1.5 px-3">
                        <div className="flex items-center">
                            <Icon className="!w-6 !h-6 !text-white" />
                            <span className="ltr:pl-2 rtl:pr-2 text-sm text-white">{item.label}</span>
                        </div>
                        <div className={`rtl:rotate-180 ${isExpanded ? 'rotate-90' : ''}`}>
                            <IconChevronRight className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </button>

                {isExpanded && <ul className="sub-menu bg-secondary-dark/30">{filteredSubItems.map((subItem: any) => renderMenuItem(subItem, true))}</ul>}
            </li>
        );
    };

    // Show loading state while user profile is being fetched
    // if (userProfileLoading || !authUser?.user?.id) {
    //     return (
    //         <div className={semidark ? 'dark' : ''}>
    //             <nav className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] sm:w-[280px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300`}>
    //                 <div className="bg-secondary dark:bg-secondary h-full flex flex-col">
    //                     <div className="flex justify-between items-center px-3 py-2">
    //                         <NavLink to="/" className="main-logo flex items-center shrink-0">
    //                             <img className="w-[160px] sm:w-[180px] ml-[5px] flex-none brightness-0 invert" src="/assets/images/morevanstext.png" alt="logo" />
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
            <nav className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] sm:w-[280px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300`}>
                <div className="bg-secondary dark:bg-secondary h-full flex flex-col">
                    <div className="flex justify-between items-center px-3 py-2">
                        <NavLink to="/" className="main-logo flex items-center shrink-0">
                            <img className="w-[160px] sm:w-[180px] ml-[5px] flex-none brightness-0 invert" src="/assets/images/morevanstext.png" alt="logo" />
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-7 h-7 rounded-full flex items-center hover:bg-secondary-dark transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconMenu2 className="m-auto w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="px-3 py-2 border-b border-secondary-dark/30">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <IconUser className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {userProfile?.name || userProfile?.email || authUser?.user?.name || authUser?.user?.email || 'Admin User'}
                                </p>
                                <p className="text-xs text-white/70">
                                    {userProfile?.user_type || authUser?.user?.user_type || 'Administrator'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <PerfectScrollbar className="flex-1">
                            <ul className="relative font-semibold space-y-0.5 p-3 py-2 text-base">{menuItems.map((item) => renderMenuItem(item))}</ul>
                        </PerfectScrollbar>

                        <div className="p-3 border-t border-secondary-dark/30 mt-auto">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('userRole');
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('token');
                                    window.location.href = '/login';
                                }}
                                className="flex items-center w-full px-3 py-1.5 text-white hover:bg-secondary-light/10 rounded-lg transition-colors duration-200"
                            >
                                <IconLogout className="w-5 h-5 text-white" />
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
