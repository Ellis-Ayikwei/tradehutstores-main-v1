import { PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import App from '../../App';
import { IRootState } from '../../store';
import { toggleSidebar } from '../../store/themeConfigSlice';
import Footer from './Footer';
import Header from './Header';
import Setting from './Setting';
import Sidebar from './Sidebar';
import Portals from '../../components/Portals';

interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
        name?: string;
    };
}

const FlexibleLayout = ({ children }: PropsWithChildren) => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();
    const isAuthenticated = useIsAuthenticated();
    const authUser = useAuthUser() as AuthUser | null;

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

    // If user is authenticated, show the full layout with sidebar
    if (isAuthenticated && authUser?.user) {
        return (
            <App>
                <div className="min-h-screen flex flex-col">
                    <div className="flex flex-1">
                        {/* Sidebar */}
                        {themeConfig.sidebar && (
                            <Sidebar />
                        )}

                        {/* Main Content */}
                        <div className="flex flex-col flex-1">
                            <Header />
                            <main className="flex-1 relative">
                                <Suspense>
                                    <div className={`${themeConfig.animation} p-6 animate__animated bg-white dark:bg-black`}>{children}</div>
                                </Suspense>
                            </main>
                            <Footer />
                        </div>
                    </div>
                </div>
            </App>
        );
    }

    // If user is not authenticated, show a simple layout without sidebar
    return (
        <App>
            <div className="text-black dark:text-white-dark min-h-screen bg-white dark:bg-black">
                {/* Simple header for non-authenticated users */}
                <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center">
                                <a href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                                    MoreVans
                                </a>
                            </div>
                            <div className="flex items-center space-x-4">
                                <a href="/login" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium">
                                    Sign In
                                </a>
                                <a href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Sign Up
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <main className="min-h-screen">{children}</main>

                {/* Simple footer for non-authenticated users */}
                <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="text-center text-gray-600 dark:text-gray-400 text-sm">© 2024 MoreVans. All rights reserved.</div>
                    </div>
                </footer>
            </div>
        </App>
    );
};

export default FlexibleLayout;
