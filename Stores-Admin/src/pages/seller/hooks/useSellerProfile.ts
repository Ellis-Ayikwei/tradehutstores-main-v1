import useSWR from 'swr';
import { fetchSellerProfile, sellerProfileApi, type SellerProfile } from '@/services/sellerProfileService';
import type { SellerApiError } from '@/services/sellerStatsService';

/**
 * The signed-in seller's store profile and verification state. The SWR key is shared, so the
 * verification banner and the settings page reuse one request.
 */
export function useSellerProfile() {
    const { data, error, isLoading, isValidating, mutate } = useSWR<SellerProfile, SellerApiError>(sellerProfileApi.me, fetchSellerProfile, {
        revalidateOnFocus: true,
        dedupingInterval: 30000,
        shouldRetryOnError: false,
        keepPreviousData: true,
    });

    return {
        profile: data,
        error,
        isLoading,
        isValidating,
        mutate,
        revalidate: () => mutate(),
    };
}
