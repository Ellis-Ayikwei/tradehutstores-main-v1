import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import { motion } from 'framer-motion';
import { IconShield, IconLoader } from '@tabler/icons-react';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';

interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
        name?: string;
    };
}

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedGroups?: string[]; // group-based access control only
}

// Helper to normalize any value into a lowercase string array
function toLowerStringArray(input: any): string[] {
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
}

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block mb-4">
                <IconLoader className="w-8 h-8 text-blue-600" />
            </motion.div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Checking Authentication</h2>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your access...</p>
        </motion.div>
    </div>
);

const UnauthorizedScreen: React.FC<{ userType?: string }> = ({ userType }) => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md mx-auto px-6">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-6"
            >
                <IconShield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don't have permission to access this page.
                {userType && (
                    <span className="block mt-2 text-sm">
                        Current role: <span className="font-medium">{userType}</span>
                    </span>
                )}
            </p>

            <div className="space-y-3">
                <button onClick={() => window.history.back()} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Go Back
                </button>
                <button
                    onClick={() => (window.location.href = '/dashboard')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    Go to Dashboard
                </button>
            </div>
        </motion.div>
    </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedGroups }) => {
    const isAuthenticated = useIsAuthenticated();
    const authUser = useAuthUser() as any;
    const location = useLocation();
    const [isInitialized, setIsInitialized] = React.useState(false);
    
    // Wait for auth to initialize on first load
    React.useEffect(() => {
        // Small delay to let react-auth-kit hydrate from storage
        const timer = setTimeout(() => {
            setIsInitialized(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);
    
    // Also check localStorage as backup
    const hasLocalToken = typeof window !== 'undefined' && 
        (localStorage.getItem('tradehut_access_token') || localStorage.getItem('_auth'));
    
    // Extract user ID - handle both nested (authUser.user.id) and direct (authUser.id) structures
    const userId = authUser?.user?.id || authUser?.id || (authUser && typeof authUser === 'object' && 'id' in authUser ? authUser.id : null);
    
    // Also try to get user from localStorage backup
    const localUser = React.useMemo(() => {
        try {
            const stored = localStorage.getItem('tradehut_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }, []);
    
    const effectiveUserId = userId || localUser?.id;
    
    // Use effective user data (from auth or localStorage)
    const effectiveUser = authUser || localUser;
    
    // Only fetch profile if we have a valid user ID
    const { data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useSWR(
        effectiveUserId ? `/users/${effectiveUserId}/profile/` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
        }
    );

    // Show loading while initializing
    if (!isInitialized && !isAuthenticated && !hasLocalToken) {
        return <LoadingScreen />;
    }

    // Redirect to login if not authenticated (and no backup token in localStorage)
    if (isInitialized && !isAuthenticated && !hasLocalToken) {
        return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }

    // If we have tokens but auth isn't ready yet, show loading
    if (hasLocalToken && !isAuthenticated) {
        return <LoadingScreen />;
    }

    // If authenticated but no user data or user ID, use localStorage backup or show loading
    if (!effectiveUser && !effectiveUserId) {
        return <LoadingScreen />;
    }
    
    // Normalize user's groups
    const userGroups = toLowerStringArray(userProfile?.groups);

    // Global bypass: Administrators (and Super/Admin by user_type) can view all pages
    const userTypeLc = (userProfile?.user_type || effectiveUser?.user_type || '').toString().toLowerCase();
    const isGlobalAdmin = userGroups.includes('administrators') || userGroups.includes('super admins') || userTypeLc === 'super_admin' || effectiveUser?.is_superuser || effectiveUser?.is_staff;

    // If route specifies allowed groups, enforce them unless global admin
    if (!isGlobalAdmin && allowedGroups && allowedGroups.length) {
        const allowed = allowedGroups.map((g) => g.toLowerCase());
        const hasAccess = userGroups.some((g) => allowed.includes(g));
        if (!hasAccess) {
            const userType = (effectiveUser?.user?.user_type || effectiveUser?.user_type || '').toString().toLowerCase();
            return <UnauthorizedScreen userType={userType} />;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
