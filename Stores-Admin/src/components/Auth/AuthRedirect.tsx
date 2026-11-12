import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import { useUserAccess } from '@/pages/seller/hooks/useUserAccess';
import { safeInternalPath } from '@/helper/safeInternalPath';

interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
        name?: string;
    };
}

interface AuthRedirectProps {
    children: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
    const isAuthenticated = useIsAuthenticated();
    const authUser = useAuthUser() as AuthUser | null;
    const location = useLocation();
    const { isResolving, isSeller, isStaff } = useUserAccess();

    // If user is authenticated, redirect them away from auth pages
    if (isAuthenticated && authUser?.user) {
        const userType = authUser.user.user_type?.toLowerCase();
        const searchParams = new URLSearchParams(location.search);
        const from = safeInternalPath(searchParams.get('from'));

        // If there's a valid same-origin 'from' parameter, redirect there
        if (from) {
            return <Navigate to={from} replace />;
        }

        // Wait for the profile (group list) so a seller is never sent to the wrong page first
        if (isResolving) {
            return <div className="min-h-screen" aria-busy="true" aria-label="Loading" />;
        }

        // Seller-only accounts land on the seller dashboard
        if (isSeller && !isStaff) {
            return <Navigate to="/seller/overview" replace />;
        }

        // Otherwise, redirect based on user type
        const adminRoles = ['super_admin', 'admin', 'underwriter', 'premium_admin', 'sales'];

        if (adminRoles.includes(userType)) {
            return <Navigate to="/admin/dashboard" replace />;
        } else {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};

export default AuthRedirect;
