'use client';

import { PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import App from '../../App';
import Portals from '../../components/Portals';
import { IRootState } from '../../store';
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import { LayoutGrid, List, MessageCircle, ReceiptText } from 'lucide-react';
import IconLoader from '../Icon/IconLoader';
import { Toaster } from '@/components/shadcn/sonner';
import { cn } from '@/lib/utils';

const BOTTOM_NAV = [
    { to: '/admin/dashboard', Icon: LayoutGrid, label: 'Home' },
    { to: '/admin/products/list', Icon: List, label: 'Products' },
    { to: '/admin/orders/list', Icon: ReceiptText, label: 'Orders' },
    { to: '/admin/notifications', Icon: MessageCircle, label: 'Messages' },
];

const DefaultLayout = ({ children }: PropsWithChildren) => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    const [showLoader, setShowLoader] = useState(true);
    const [showTopButton, setShowTopButton] = useState(false);

    const goToTop = () => {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };

    const onScrollHandler = () => {
        if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
            setShowTopButton(true);
        } else {
            setShowTopButton(false);
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', onScrollHandler);

        const screenLoader = document.getElementsByClassName('screen_loader');
        if (screenLoader?.length) {
            screenLoader[0].classList.add('animate__fadeOut');
            setTimeout(() => {
                setShowLoader(false);
            }, 200);
        }

        return () => {
            window.removeEventListener('onscroll', onScrollHandler);
        };
    }, []);

    return (
        <App>
            {/* BEGIN MAIN CONTAINER */}
            <div className="relative">
                {/* Single app-wide toast mount (shadcn/sonner) */}
                <Toaster />
                {/* screen loader */}
                {showLoader && (
                    <div className="screen_loader fixed inset-0 bg-[#fafafa] dark:bg-[#060818] z-[60] grid place-content-center animate__animated">
                        <IconLoader />
                    </div>
                )}
                <div className="fixed bottom-6 ltr:right-6 rtl:left-6 z-50">
                    {showTopButton && (
                        <button type="button" className="btn btn-outline-primary rounded-full p-2 animate-pulse bg-[#fafafa] dark:bg-[#060818] dark:hover:bg-primary" onClick={goToTop}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className={`${themeConfig.navbar} main-container text-black dark:text-white-dark min-h-screen bg-background`}>
                    {/* BEGIN SIDEBAR */}
                    <Sidebar />
                    {/* END SIDEBAR */}

                    <div className="main-content flex flex-col min-h-screen pb-16 md:pb-0">
                        {/* BEGIN TOP NAVBAR */}
                        <Header />
                        {/* END TOP NAVBAR */}

                        {/* BEGIN CONTENT AREA */}
                        <Suspense fallback={<div className="flex justify-center items-center h-screen"><IconLoader /></div>}>
                            <div className={`${themeConfig.animation}p-2 animate__animated flex-1`}>{children}</div>
                        </Suspense>
                        {/* END CONTENT AREA */}

                        {/* BEGIN FOOTER */}
                        <Footer />
                        {/* END FOOTER */}
                        <Portals />
                    </div>
                </div>

                {/* Mobile bottom nav (hidden on md+). */}
                <nav aria-label="Quick navigation" className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-2xl border-t border-border bg-background px-4 py-2 shadow-lg md:hidden">
                    {BOTTOM_NAV.map(({ to, Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1 text-[10px] font-bold transition-colors',
                                    isActive ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground'
                                )
                            }
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
        </App>
    );
};

export default DefaultLayout;
