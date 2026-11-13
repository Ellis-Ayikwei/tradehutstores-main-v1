import { useMemo } from 'react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useSWR from 'swr';
import fetcher from '@/services/fetcher';

/** Normalises the `groups` payload (strings or `{name}` objects, or a comma list) to lowercase names. */
export function normalizeGroups(input: unknown): string[] {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input
            .map((item) => {
                if (typeof item === 'string') return item.toLowerCase();
                if (item && typeof item === 'object') {
                    const o = item as Record<string, unknown>;
                    return String(o.name || o.role || o.group || o.title || '').toLowerCase();
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

/**
 * Who is signed in and which groups they hold. Shares the SWR key with
 * ProtectedRoute and the Sidebar (`/users/<id>/profile/`), so it adds no request.
 */
export function useUserAccess() {
    const authUser = useAuthUser<any>();
    const localUser = useMemo(() => {
        try {
            const stored = localStorage.getItem('tradehut_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }, []);

    const userId: string | null = authUser?.user?.id || authUser?.id || localUser?.id || null;

    const { data: profile, isLoading } = useSWR(userId ? `/users/${userId}/profile/` : null, fetcher, {
        revalidateOnFocus: false,
        keepPreviousData: true,
    });

    const groups = normalizeGroups(profile?.groups);

    return {
        userId,
        profile,
        groups,
        /** True while the profile (and so the group list) is still being fetched for the first time. */
        isResolving: Boolean(userId) && isLoading && !profile,
    };
}
