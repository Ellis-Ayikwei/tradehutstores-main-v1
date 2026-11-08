import { sellerGet } from './client'
import type { Paged, RecentSellerOrder, SellerBalance, SellerStats } from './types'

/**
 * Overview data.
 *   SE4  GET sellers/me/stats/        counts + sales_30d (+ optional sales_by_day)
 *   P6   GET payments/seller/balance/ pending / available / paid_out / min_payout
 *   O6   GET orders/seller/           newest first
 */

export const SELLER_STATS_URL = 'sellers/me/stats/'
export const SELLER_BALANCE_URL = 'payments/seller/balance/'
export const SELLER_ORDERS_URL = 'orders/seller/'

export const fetchSellerStats = () => sellerGet<SellerStats>(SELLER_STATS_URL)

export const fetchSellerBalance = () => sellerGet<SellerBalance>(SELLER_BALANCE_URL)

export const fetchRecentSellerOrders = (pageSize = 5) =>
    sellerGet<Paged<RecentSellerOrder>>(SELLER_ORDERS_URL, { page: 1, page_size: pageSize })

/** Formats a decimal string for display. Returns an en dash when there is no usable value. */
export function formatMoney(amount: string | number | null | undefined, currency: string | undefined): string {
    if (amount === null || amount === undefined || amount === '') return '–'
    const n = Number(amount)
    if (!Number.isFinite(n)) return '–'
    const plain = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (!currency) return plain
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
    } catch {
        return `${currency} ${plain}`
    }
}
