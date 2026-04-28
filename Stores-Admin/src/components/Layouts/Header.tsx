import i18next from 'i18next';
import { useEffect, useState } from 'react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useSignOut from 'react-auth-kit/hooks/useSignOut';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from './Header/NotificationBell';
import { AppDispatch, IRootState } from '../../store';
import { LogoutUser } from '../../store/authSlice';
import { toggleRTL, toggleSidebar, toggleTheme } from '../../store/themeConfigSlice';
import Dropdown from '../Dropdown';
import IconArrowLeft from '../Icon/IconArrowLeft';
import IconCaretDown from '../Icon/IconCaretDown';
import IconInfoCircle from '../Icon/IconInfoCircle';
import IconLogout from '../Icon/IconLogout';
import IconMailDot from '../Icon/IconMailDot';
import IconMenu from '../Icon/IconMenu';
import IconMoon from '../Icon/IconMoon';
import IconSun from '../Icon/IconSun';
import IconUser from '../Icon/IconUser';
import IconXCircle from '../Icon/IconXCircle';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';

const Header = () => {
    const dispatch: AppDispatch = useDispatch();
    const auth = useAuthUser<any>();
    const location = useLocation();
    const user = auth?.user || null;
    const userId = user?.id;
    const isLoggedIn = useSelector((state: IRootState) => state.auth.isLoggedIn);
    const signOut = useSignOut();
    const navigate = useNavigate();

    // Add loading state for logout
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            for (let i = 0; i < all.length; i++) {
                all[0]?.classList.remove('active');
            }
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
                if (ele) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele?.classList.add('active');
                    });
                }
            }
        }
    }, [location]);

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    function createMarkup(messages: any) {
        return { __html: messages };
    }
    const [messages, setMessages] = useState([
        {
            id: 1,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-blue-500 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 11 2-2-2-2"></path><path d="M11 13h4"></path><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect></svg></span>',
            title: 'New Shipment Assigned',
            message: 'Shipment MV-23460 ready for pickup.',
            time: '5min',
        },
        {
            id: 2,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-green-500 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="10"></circle></svg></span>',
            title: 'Delivery Completed',
            message: 'Package delivered successfully to customer.',
            time: '15min',
        },
        {
            id: 3,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-orange-500 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span>',
            title: 'Route Delay Alert',
            message: 'Traffic delay on Route A-205.',
            time: '1hr',
        },
        {
            id: 4,
            image: '<span className="grid place-content-center w-9 h-9 rounded-full bg-purple-500 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg></span>',
            title: 'Fleet Maintenance',
            message: 'Vehicle LN65 ABC due for service.',
            time: '2hr',
        },
    ]);

    const removeMessage = (value: number) => {
        setMessages(messages.filter((user) => user.id !== value));
    };

    const [notifications, setNotifications] = useState([
        {
            id: 1,
            profile: 'user-profile.jpeg',
            message: '<strong className="text-sm mr-1">Fleet Manager</strong>assigned you to <strong>Route Optimization</strong>',
            time: '45 min ago',
        },
        {
            id: 2,
            profile: 'profile-34.jpeg',
            message: '<strong className="text-sm mr-1">Dispatch Team</strong>updated <strong>Delivery Schedule</strong>',
            time: '2h Ago',
        },
        {
            id: 3,
            profile: 'profile-16.jpeg',
            message: '<strong className="text-sm mr-1">Customer Service</strong>reported delivery confirmation',
            time: '4h Ago',
        },
    ]);

    const removeNotification = (value: number) => {
        setNotifications(notifications.filter((user) => user.id !== value));
    };

    const [search, setSearch] = useState(false);

    const setLocale = (flag: string) => {
        setFlag(flag);
        if (flag.toLowerCase() === 'ae') {
            dispatch(toggleRTL('rtl'));
        } else {
            dispatch(toggleRTL('ltr'));
        }
    };
    const [flag, setFlag] = useState(themeConfig.locale);

    const { t } = useTranslation();

    const handleLogoutClick = async () => {
        if (isLoggingOut) return; // Prevent multiple clicks

        setIsLoggingOut(true);
        try {
            // Call logout action with signOut hook
            const logoutResponse = await dispatch(LogoutUser({ signOut }) as any);

            if (logoutResponse.meta?.requestStatus === 'fulfilled' || logoutResponse.type?.endsWith('/fulfilled')) {
                // Clear all local storage
                localStorage.clear();
                sessionStorage.clear();

                // Navigate to login page
                navigate('/login', { replace: true });

                // Show success message (optional)
                console.log('Logout successful');
            } else {
                // Handle logout failure
                console.error('Logout failed:', logoutResponse.error || 'Unknown error');

                // Force logout on client side even if server call fails
                signOut();
                localStorage.clear();
                sessionStorage.clear();
                navigate('/login', { replace: true });
            }
        } catch (error) {
            console.error('Logout error:', error);

            // Force logout on client side even if there's an error
            try {
                signOut();
                localStorage.clear();
                sessionStorage.clear();
                navigate('/login', { replace: true });
            } catch (fallbackError) {
                console.error('Fallback logout error:', fallbackError);
                // Last resort - redirect to login
                window.location.href = '/login';
            }
        } finally {
            signOut();
            setIsLoggingOut(false);
        }
    };

    const confirmLogout = () => {
        setShowLogoutConfirm(true);
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    useEffect(() => {
        console.log('themeConfig.sidebar', themeConfig.sidebar);
    }, [themeConfig.sidebar]);

    return (
        <header className={`sticky top-0 z-40 ${themeConfig.semidark && themeConfig.menu === 'horizontal' ? 'dark' : ''}`}>
            <div className="glass-header shadow-sm border-b border-outline-variant/10">
                <div className="relative bg-surface/70">
                    <div className="flex w-full items-center px-4 sm:px-6 py-3">
                        {/* Left Section - Page title + sidebar toggle */}
                        <div className="flex items-center gap-3">
                            {/* Mobile brand mark */}
                            <span className="font-syne text-xl font-black text-on-surface md:hidden">TradeHut</span>
                            {/* Desktop page title */}
                            <h1 className="font-headline font-bold text-xl text-on-surface hidden md:block">Seller Dashboard</h1>
                            <button
                                type="button"
                                className="collapse-icon flex-none text-on-surface-variant hover:text-primary-container p-2 rounded-xl hover:bg-surface-container-low transition-all duration-200"
                                onClick={() => {
                                    dispatch(toggleSidebar());
                                }}
                            >
                                <IconMenu className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Center Section - Spacer */}
                        <div className="flex-1"></div>

                        {/* Right Section - Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 rtl:gap-reverse">
                            {/* Desktop quick-nav links */}
                            <div className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-widest text-on-surface/60 mr-2">
                                <Link to="/admin/inventory/stock" className="hover:text-primary-container transition-colors">Inventory</Link>
                                <Link to="/admin/revenue/overview" className="hover:text-primary-container transition-colors">Analytics</Link>
                                <Link to="/admin/customers/list" className="hover:text-primary-container transition-colors">Customers</Link>
                            </div>
                            <div className="hidden lg:block w-px h-5 bg-outline-variant/30 mx-1" />

                            {/* Theme Toggle */}
                            <div className="hidden sm:flex items-center">
                                {themeConfig.theme === 'light' ? (
                                    <button
                                        className="flex items-center p-2 rounded-xl text-on-surface-variant hover:text-primary-container hover:bg-surface-container-low transition-all duration-200"
                                        onClick={() => {
                                            dispatch(toggleTheme('dark'));
                                        }}
                                    >
                                        <IconSun className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        className="flex items-center p-2 rounded-xl text-on-surface-variant hover:text-primary-container hover:bg-surface-container-low transition-all duration-200"
                                        onClick={() => {
                                            dispatch(toggleTheme('light'));
                                        }}
                                    >
                                        <IconMoon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Language Selector */}
                            <div className="dropdown shrink-0 hidden sm:block">
                                <Dropdown
                                    offset={[0, 8]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="block p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all duration-200"
                                    button={<img className="w-5 h-5 object-cover rounded-full" src={`/assets/images/flags/${flag.toUpperCase()}.svg`} alt="flag" />}
                                >
                                    <ul className="!px-2 grid grid-cols-2 gap-2 font-semibold w-[280px] sm:w-[320px] bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/15 rounded-xl shadow-card">
                                        {themeConfig.languageList.map((item: any) => {
                                            return (
                                                <li key={item.code}>
                                                    <button
                                                        type="button"
                                                        className={`flex w-full hover:text-primary-container hover:bg-surface-container-low rounded-lg p-2 transition-all duration-200 text-on-surface ${
                                                            i18next.language === item.code ? 'bg-surface-container-low text-primary-container' : ''
                                                        }`}
                                                        onClick={() => {
                                                            i18next.changeLanguage(item.code);
                                                            setLocale(item.code);
                                                        }}
                                                    >
                                                        <img src={`/assets/images/flags/${item.code.toUpperCase()}.svg`} alt="flag" className="w-5 h-5 object-cover rounded-full" />
                                                        <span className="ltr:ml-3 rtl:mr-3">{item.name}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </Dropdown>
                            </div>

                            {/* Messages */}
                            {/* <div className="dropdown shrink-0">
                                <Dropdown
                                    offset={[0, 8]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="relative block p-1.5 sm:p-2 rounded-xl bg-white/60 backdrop-blur-sm dark:bg-gray-800/60 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300"
                                    button={
                                        <div className="relative">
                                            <IconMailDot className="w-4 h-4 sm:w-5 sm:h-5" />
                                            {messages.length > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                                                    {messages.length}
                                                </span>
                                            )}
                                        </div>
                                    }
                                >
                                    <ul className="!py-0 text-dark dark:text-white-dark w-[300px] sm:w-[350px] text-xs bg-white/90 backdrop-blur-md border border-white/20 dark:bg-gray-800/90">
                                        <li className="mb-5" onClick={(e) => e.stopPropagation()}>
                                            <div className="hover:!bg-transparent overflow-hidden relative rounded-t-md p-5 text-white w-full !h-[68px]">
                                                <div className="absolute h-full w-full bg-gradient-to-r from-orange-500 to-blue-600 inset-0"></div>
                                                <h4 className="font-semibold relative z-10 text-lg">Logistics Updates</h4>
                                            </div>
                                        </li>
                                        {messages.length > 0 ? (
                                            <>
                                                <li onClick={(e) => e.stopPropagation()}>
                                                    {messages.map((message) => {
                                                        return (
                                                            <div key={message.id} className="flex items-center py-3 px-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                <div dangerouslySetInnerHTML={createMarkup(message.image)}></div>
                                                                <span className="px-3 dark:text-gray-300">
                                                                    <div className="font-semibold text-sm dark:text-white/90">{message.title}</div>
                                                                    <div className="text-gray-600 dark:text-gray-400">{message.message}</div>
                                                                </span>
                                                                <span className="font-semibold bg-orange-100 text-orange-600 rounded-full text-xs px-2 py-1 ltr:ml-auto rtl:mr-auto whitespace-nowrap dark:bg-orange-900/30 dark:text-orange-400">
                                                                    {message.time}
                                                                </span>
                                                                <button type="button" className="text-gray-300 hover:text-red-500 ml-2 transition-colors" onClick={() => removeMessage(message.id)}>
                                                                    <IconXCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </li>
                                                <li className="border-t border-gray-200 dark:border-gray-600 text-center mt-5">
                                                    <button type="button" className="text-orange-500 font-semibold group hover:text-orange-600 justify-center !py-4 !h-[48px] transition-colors">
                                                        <span className="group-hover:underline ltr:mr-1 rtl:ml-1">VIEW ALL UPDATES</span>
                                                        <IconArrowLeft className="group-hover:translate-x-1 transition duration-300 ltr:ml-1 rtl:mr-1" />
                                                    </button>
                                                </li>
                                            </>
                                        ) : (
                                            <li className="mb-5" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" className="!grid place-content-center hover:!bg-transparent text-lg min-h-[200px]">
                                                    <div className="mx-auto ring-4 ring-orange-500/30 rounded-full mb-4 text-orange-500">
                                                        <IconInfoCircle fill={true} className="w-10 h-10" />
                                                    </div>
                                                    No logistics updates available.
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                </Dropdown>
                            </div> */}

                            {/* Notifications */}
                            <div className="dropdown shrink-0">
                                <NotificationBell />
                            </div>

                            {/* User Profile */}
                            <div className="dropdown shrink-0">
                                <Dropdown
                                    offset={[0, 8]}
                                    placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                    btnClassName="relative group block"
                                    button={
                                        <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-container-low transition-all duration-200">
                                            <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center flex-shrink-0">
                                                <IconUser className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="text-left hidden sm:block">
                                                <p className="text-sm font-bold text-on-surface">{user?.first_name || 'User'}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
                                                    {user?.user_type || 'User'}
                                                </p>
                                            </div>
                                            <IconCaretDown className="w-4 h-4 text-on-surface-variant" />
                                        </div>
                                    }
                                >
                                    <div className="w-[320px] sm:w-[380px] bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/15 rounded-2xl shadow-card-hover overflow-hidden">
                                        {/* Profile Header */}
                                        <div className="relative p-6 bg-surface-container-low border-b border-outline-variant/10">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl primary-gradient flex items-center justify-center shadow-card">
                                                        <IconUser className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-bid-green border-2 border-surface-container-lowest rounded-full" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-on-surface truncate">{user?.full_name || user?.first_name || 'User'}</h4>
                                                    <p className="text-sm text-on-surface-variant truncate">{user?.email || 'user@example.com'}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-container/10 text-primary-container">
                                                            {user?.role || 'User'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="p-4 bg-surface-container/50 border-b border-outline-variant/10">
                                            <div className="grid grid-cols-3 gap-3">
                                                {[['24', 'Orders'], ['4.8', 'Rating'], ['98%', 'Success']].map(([val, label]) => (
                                                    <div key={label} className="text-center">
                                                        <div className="font-mono text-lg font-bold text-on-surface">{val}</div>
                                                        <div className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">{label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Navigation Links */}
                                        <div className="p-2">
                                            {/* Mobile Theme Toggle */}
                                            <div className="sm:hidden mb-2">
                                                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                                                    <span className="text-sm font-medium text-on-surface">Theme</span>
                                                    <div className="flex items-center gap-1">
                                                        {themeConfig.theme === 'light' ? (
                                                            <button
                                                                className="p-2 rounded-lg hover:bg-surface-container transition-all duration-200"
                                                                onClick={() => dispatch(toggleTheme('dark'))}
                                                            >
                                                                <IconSun className="w-4 h-4 text-on-surface-variant" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="p-2 rounded-lg hover:bg-surface-container transition-all duration-200"
                                                                onClick={() => dispatch(toggleTheme('light'))}
                                                            >
                                                                <IconMoon className="w-4 h-4 text-on-surface-variant" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mobile Language Selector */}
                                            <div className="sm:hidden mb-2">
                                                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                                                    <span className="text-sm font-medium text-on-surface">Language</span>
                                                    <div className="flex items-center gap-1">
                                                        {themeConfig.languageList.slice(0, 3).map((item: any) => (
                                                            <button
                                                                key={item.code}
                                                                type="button"
                                                                className={`p-1 rounded-lg transition-all duration-200 ${
                                                                    i18next.language === item.code
                                                                        ? 'bg-primary-container/10 text-primary-container'
                                                                        : 'hover:bg-surface-container'
                                                                }`}
                                                                onClick={() => {
                                                                    i18next.changeLanguage(item.code);
                                                                    setLocale(item.code);
                                                                }}
                                                            >
                                                                <img src={`/assets/images/flags/${item.code.toUpperCase()}.svg`} alt="flag" className="w-4 h-4 object-cover rounded-full" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Profile Links */}
                                            <div className="space-y-1">
                                                <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-all duration-200 group">
                                                    <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                                                        <IconUser className="w-4 h-4 text-primary-container" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-on-surface">Profile Settings</div>
                                                        <div className="text-xs text-on-surface-variant opacity-70">Manage your account</div>
                                                    </div>
                                                </Link>

                                                <Link
                                                    to="/admin/dashboard"
                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-all duration-200 group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                                                        <IconMenuDashboard className="w-4 h-4 text-primary-container" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-on-surface">Dashboard</div>
                                                        <div className="text-xs text-on-surface-variant opacity-70">View your overview</div>
                                                    </div>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Logout Section */}
                                        <div className="p-2 border-t border-outline-variant/10">
                                            <button
                                                type="button"
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 active:scale-95 ${
                                                    isLoggingOut
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'hover:bg-error-container/20 text-error'
                                                }`}
                                                onClick={handleLogoutClick}
                                                disabled={isLoggingOut}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center">
                                                    {isLoggingOut ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-error border-t-transparent rounded-full" />
                                                    ) : (
                                                        <IconLogout className="w-4 h-4 text-error" />
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className="text-sm font-medium">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</div>
                                                    <div className="text-xs text-on-surface-variant opacity-70">{isLoggingOut ? 'Please wait...' : 'Logout from your account'}</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </Dropdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
