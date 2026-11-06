import i18next from 'i18next';
import { ChevronDown, LayoutDashboard, Loader2, LogOut, Menu, Moon, Sun, User, Languages } from 'lucide-react';
import { useState } from 'react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useSignOut from 'react-auth-kit/hooks/useSignOut';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { cn } from '@/lib/utils';
import { AppDispatch, IRootState } from '../../store';
import { LogoutUser } from '../../store/authSlice';
import { toggleRTL, toggleSidebar, toggleTheme } from '../../store/themeConfigSlice';
import CurrencySwitcher from './Header/CurrencySwitcher';
import NotificationBell from './Header/NotificationBell';

const QUICK_LINKS = [
    { to: '/admin/inventory/stock', label: 'Inventory' },
    { to: '/admin/revenue/overview', label: 'Analytics' },
    { to: '/admin/customers/list', label: 'Customers' },
];

const Flag = ({ code, className }: { code: string; className?: string }) => (
    <img className={cn('h-5 w-5 rounded-full object-cover', className)} src={`/assets/images/flags/${code.toUpperCase()}.svg`} alt="" />
);

const Header = () => {
    const dispatch: AppDispatch = useDispatch();
    const auth = useAuthUser<any>();
    const user = auth?.user || null;
    const signOut = useSignOut();
    const navigate = useNavigate();

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const isRtl = themeConfig.rtlClass === 'rtl';
    const menuAlign = isRtl ? 'start' : 'end';
    const isLight = themeConfig.theme === 'light';

    const [flag, setFlag] = useState(themeConfig.locale);

    const setLocale = (code: string) => {
        setFlag(code);
        if (code.toLowerCase() === 'ae') {
            dispatch(toggleRTL('rtl'));
        } else {
            dispatch(toggleRTL('ltr'));
        }
    };

    const changeLanguage = (code: string) => {
        i18next.changeLanguage(code);
        setLocale(code);
    };

    const handleThemeToggle = () => {
        dispatch(toggleTheme(isLight ? 'dark' : 'light'));
    };

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

    const displayName = user?.full_name || user?.first_name || 'User';

    return (
        <header className={cn('sticky top-0 z-40', themeConfig.semidark && themeConfig.menu === 'horizontal' && 'dark')}>
            <div className="border-b border-border bg-background shadow-sm">
                <div className="flex w-full items-center gap-2 px-3 py-2 sm:px-6 sm:py-3">
                    {/* Left: sidebar toggle + brand / page title */}
                    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
                        <Button variant="ghost" size="icon" className="collapse-icon flex-none text-muted-foreground hover:text-foreground" aria-label="Toggle sidebar" onClick={() => dispatch(toggleSidebar())}>
                            <Menu className="h-5 w-5" />
                        </Button>
                        {/* Mobile brand mark */}
                        <span className="truncate text-lg font-black text-foreground md:hidden">TradeHut</span>
                        {/* Desktop page title */}
                        <h1 className="hidden text-xl font-bold text-foreground md:block">Seller Dashboard</h1>
                    </div>

                    <div className="flex-1" />

                    {/* Right: actions */}
                    <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                        {/* Desktop quick-nav links */}
                        <nav className="mr-2 hidden items-center gap-6 text-xs uppercase tracking-widest text-muted-foreground lg:flex" aria-label="Quick links">
                            {QUICK_LINKS.map((link) => (
                                <Link key={link.to} to={link.to} className="transition-colors hover:text-primary">
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="mx-1 hidden h-5 w-px bg-border lg:block" />

                        {/* Theme toggle (sm+; on mobile it lives in the user menu) */}
                        <Button variant="ghost" size="icon" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex" aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'} onClick={handleThemeToggle}>
                            {isLight ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>

                        {/* Currency switcher */}
                        <CurrencySwitcher />

                        {/* Language selector (sm+; on mobile it lives in the user menu) */}
                        <div className="hidden sm:block">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Change language">
                                        <Flag code={flag} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={menuAlign} sideOffset={8} className="grid max-h-80 w-[280px] grid-cols-2 gap-1 overflow-y-auto p-2 sm:w-[320px]">
                                    {themeConfig.languageList.map((item: any) => (
                                        <DropdownMenuItem
                                            key={item.code}
                                            className={cn('gap-3 py-2 font-semibold', i18next.language === item.code && 'bg-accent text-primary')}
                                            onSelect={() => changeLanguage(item.code)}
                                        >
                                            <Flag code={item.code} />
                                            <span className="truncate">{item.name}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Notifications */}
                        <NotificationBell />

                        {/* User menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Open user menu">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-primary-subtle text-primary-subtle-foreground">
                                            <User className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden text-left sm:block">
                                        <span className="block text-sm font-bold leading-tight text-foreground">{user?.first_name || 'User'}</span>
                                        <span className="block text-[10px] font-medium uppercase tracking-widest leading-tight text-muted-foreground">{user?.user_type || 'User'}</span>
                                    </span>
                                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={menuAlign} sideOffset={8} className="w-[min(20rem,calc(100vw-1rem))] p-0">
                                {/* Profile header */}
                                <div className="flex items-center gap-3 border-b border-border bg-muted p-4">
                                    <Avatar className="h-12 w-12 rounded-xl">
                                        <AvatarFallback className="rounded-xl bg-primary-subtle text-primary-subtle-foreground">
                                            <User className="h-6 w-6" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-bold text-foreground">{displayName}</p>
                                        <p className="truncate text-sm text-muted-foreground">{user?.email || ''}</p>
                                        <Badge variant="secondary" className="mt-1 px-2 py-0 text-[10px] uppercase tracking-wider">
                                            {user?.role || 'User'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="p-1">
                                    {/* Mobile-only: theme and language */}
                                    <DropdownMenuItem className="gap-3 py-2.5 sm:hidden" onSelect={handleThemeToggle}>
                                        {isLight ? <Moon /> : <Sun />}
                                        <span className="text-sm font-medium">{isLight ? 'Dark mode' : 'Light mode'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="gap-3 py-2.5 sm:hidden">
                                            <Languages className="h-4 w-4" />
                                            <span className="flex-1 text-sm font-medium">Language</span>
                                            <Flag code={flag} className="h-4 w-4" />
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
                                            {themeConfig.languageList.map((item: any) => (
                                                <DropdownMenuItem
                                                    key={item.code}
                                                    className={cn('gap-3 py-2', i18next.language === item.code && 'bg-accent text-primary')}
                                                    onSelect={() => changeLanguage(item.code)}
                                                >
                                                    <Flag code={item.code} className="h-4 w-4" />
                                                    <span className="truncate">{item.name}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator className="sm:hidden" />

                                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                                        <Link to="/profile">
                                            <User />
                                            <span className="flex flex-col">
                                                <span className="text-sm font-medium">Profile Settings</span>
                                                <span className="text-xs text-muted-foreground">Manage your account</span>
                                            </span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="gap-3 py-2.5">
                                        <Link to="/admin/dashboard">
                                            <LayoutDashboard />
                                            <span className="flex flex-col">
                                                <span className="text-sm font-medium">Dashboard</span>
                                                <span className="text-xs text-muted-foreground">View your overview</span>
                                            </span>
                                        </Link>
                                    </DropdownMenuItem>
                                </div>

                                                <div className="border-t border-border p-1">
                                    <DropdownMenuItem
                                        className="gap-3 py-2.5 text-destructive focus:bg-destructive-subtle focus:text-destructive-subtle-foreground"
                                        disabled={isLoggingOut}
                                        onSelect={(e) => {
                                            e.preventDefault(); // keep the menu open to show the signing-out state
                                            handleLogoutClick();
                                        }}
                                    >
                                        {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                                        <span className="flex flex-col">
                                            <span className="text-sm font-medium">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                                            <span className="text-xs text-muted-foreground">{isLoggingOut ? 'Please wait...' : 'Logout from your account'}</span>
                                        </span>
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
