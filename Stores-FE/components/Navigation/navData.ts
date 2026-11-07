'use client'

import { useMemo } from 'react'
import { useCatalogCategories } from '@/hooks/useCatalogCategories'
import { useSellerStatus } from '@/hooks/useSellerStatus'
import { SELLER_DASHBOARD_URL } from '@/lib/sellerOnboardingApi'

// Shared by TopNav (search category select + mobile drawer) and SubNav (mega popover).

export type NavSubcategory = { name: string; count: number }
export type NavCategory = { name: string; subcategories: NavSubcategory[] }

/** Event used by SubNav's mobile rail to open the drawer rendered by TopNav. */
export const OPEN_NAV_DRAWER_EVENT = 'th:open-nav-drawer'

export function openNavDrawer(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_NAV_DRAWER_EVENT))
}

export function useNavCategories(): { categories: NavCategory[]; loading: boolean; error: boolean } {
    const { categories: rows, loading, error } = useCatalogCategories()
    const categories = useMemo(
        (): NavCategory[] =>
            rows.map((row) => ({
                name: row.name,
                subcategories: row.subcategories,
            })),
        [rows]
    )
    return { categories, loading, error }
}

// ─── Seller entry (Sell on TradeHut / My store) ───────────────────────────────

export interface SellerNavItem {
    label: string
    /** Compact label for the mobile rail. */
    shortLabel: string
    href: string
    /** True when the link leaves the storefront (seller dashboard). */
    external: boolean
    /** Solid amber badge text, or null. */
    badge: string | null
}

/**
 * What the seller slot in the header / drawer should show.
 * none or unknown (signed out, loading, failed request) -> "Sell on TradeHut";
 * pending / rejected -> "My store" + Not verified; verified -> "My store";
 * suspended -> "My store" + Suspended, pointing at the status page.
 * Auth is resolved after mount inside useSellerStatus, so SSR markup stays stable.
 */
export function useSellerNav(): SellerNavItem {
    const { status } = useSellerStatus()
    const sell: SellerNavItem = {
        label: 'Sell on TradeHut',
        shortLabel: 'Sell',
        href: '/sell',
        external: false,
        badge: null,
    }
    if (status === 'unknown' || status === 'none') return sell

    const store = {
        label: 'My store',
        shortLabel: 'My store',
    }
    if (status === 'suspended') {
        return { ...store, href: '/sell', external: false, badge: 'Suspended' }
    }
    const href = SELLER_DASHBOARD_URL ?? '/sell'
    const external = SELLER_DASHBOARD_URL !== null
    return {
        ...store,
        href,
        external,
        badge: status === 'verified' ? null : 'Not verified',
    }
}

export function categoryHref(category: string, subcategory?: string): string {
    const base = `/products?category=${encodeURIComponent(category)}`
    return subcategory ? `${base}&subcategory=${encodeURIComponent(subcategory)}` : base
}
