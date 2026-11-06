'use client'

import AdTopBar from '@/components/Ads/AdTopBar'

/**
 * Promo strip above the main nav.
 *
 * Renders the admin-managed `homepage-top-bar` ad placement. When no ad is
 * live it renders nothing (no hardcoded promo copy).
 */
export default function PromoBar() {
    return <AdTopBar slug="homepage-top-bar" />
}
