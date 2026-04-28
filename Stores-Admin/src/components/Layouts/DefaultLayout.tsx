'use client';

import { PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import App from '../../App';
import Portals from '../../components/Portals';
import { IRootState } from '../../store';
import { toggleSidebar } from '../../store/themeConfigSlice';
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import IconLoader from '../Icon/IconLoader';

const DefaultLayout = ({ children }: PropsWithChildren) => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

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
                {/* sidebar menu overlay */}
                <div className={`${(!themeConfig.sidebar && 'hidden') || ''} fixed inset-0 bg-[black]/60 z-50 lg:hidden`} onClick={() => dispatch(toggleSidebar())}></div>
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

                <div className={`${themeConfig.navbar} main-container text-black dark:text-white-dark min-h-screen bg-surface`}>
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

                {/* ── Mobile bottom nav (Kinetic — hidden on md+) ─────────────────────
                    Route list preserved exactly from the sidebar.
                    Visual treatment: Kinetic warm surface + Material icons.
                ──────────────────────────────────────────────────────────────────── */}
                <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-2 md:hidden bg-surface/95 z-50 rounded-t-2xl border-t border-outline-variant/10 shadow-card-hover glass-header">
                    {[
                        { to: '/admin/dashboard', icon: 'grid_view',             label: 'Home'     },
                        { to: '/admin/products/list', icon: 'format_list_bulleted', label: 'Products' },
                        { to: '/admin/orders/list', icon: 'receipt_long',        label: 'Orders'   },
                        { to: '/admin/notifications', icon: 'chat_bubble',       label: 'Messages' },
                    ].map(({ to, icon, label }) => {
                        const isActive = typeof window !== 'undefined' && window.location.pathname.startsWith(to);
                        return (
                            <a
                                key={to}
                                href={to}
                                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-surface-container-low text-primary-container'
                                        : 'text-on-surface opacity-50 hover:opacity-100'
                                }`}
                            >
                                <span className="material-symbols-outlined text-xl">{icon}</span>
                                <span>{label}</span>
                            </a>
                        );
                    })}
                </nav>
            </div>
        </App>
    );
};

export default DefaultLayout;
