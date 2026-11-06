import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { Skeleton } from '@/components/shadcn/skeleton';
import { VerificationBanner } from './components/VerificationBanner';
import { useUserAccess } from './hooks/useUserAccess';

function RouteSkeleton() {
    return (
        <div className="space-y-3 p-2" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
        </div>
    );
}

/**
 * Guards `/seller/*` with the existing ProtectedRoute (`Sellers` group). It waits for the
 * profile first, so a seller never sees an "Access denied" flash while the groups load.
 * The verification banner sits above every seller page and shows only while the store is unverified.
 */
export function SellerRoute({ children }: { children: ReactNode }) {
    const { isResolving } = useUserAccess();
    if (isResolving) return <RouteSkeleton />;
    return (
        <ProtectedRoute allowedGroups={['Sellers']}>
            <VerificationBanner />
            {children}
        </ProtectedRoute>
    );
}

/**
 * Wraps the staff landing routes: a seller-only account is sent to the seller overview,
 * everyone else (staff, or anyone not yet resolved as a seller) gets the original page.
 */
export function SellerLandingRedirect({ children }: { children: ReactNode }) {
    const { isResolving, isSeller, isStaff } = useUserAccess();
    if (isResolving) return <RouteSkeleton />;
    if (isSeller && !isStaff) return <Navigate to="/seller/overview" replace />;
    return <>{children}</>;
}
