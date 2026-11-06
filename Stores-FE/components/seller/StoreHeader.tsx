import Image from 'next/image'
import { BadgeCheck, MessageCircle, Package, ShoppingBag, Store } from 'lucide-react'
import { RatingStars } from '@/components/common/marketplace'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import ShareButton from './ShareButton'
import type { SellerPublic } from './types'

interface StoreHeaderProps {
    storeId: string
    seller: SellerPublic | null
    productCount: number
    /** Rating shown in the header; already resolved by the page (seller value or derived from products). */
    rating: { value: number; count: number } | null
}

const WHATSAPP = 'https://wa.me/233248138722'

export function whatsappHref(storeName: string | null, storeId: string): string {
    const subject = storeName ? `the store "${storeName}"` : 'a seller store'
    const text = `Hi TradeHut, I have a question about ${subject} (store ID: ${storeId}).`
    return `${WHATSAPP}?text=${encodeURIComponent(text)}`
}

export default function StoreHeader({ storeId, seller, productCount, rating }: StoreHeaderProps) {
    const name = seller?.business_name ?? 'Seller store'
    const banner = resolveMediaSrc(seller?.store_banner)
    const logo = resolveMediaSrc(seller?.store_logo)
    const orders = seller?.total_orders ?? 0

    return (
        <header className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="relative h-16 bg-primary-100 dark:bg-primary-900 sm:h-24 lg:h-32">
                {banner ? (
                    <Image
                        src={banner}
                        alt={`${name} banner`}
                        fill
                        priority
                        sizes="(min-width: 1536px) 1536px, 100vw"
                        className="object-cover"
                    />
                ) : null}
            </div>

            <div className="flex flex-col gap-3 px-3 pb-3 sm:px-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="-mt-7 flex min-w-0 items-end gap-3 sm:-mt-9">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-primary-700 text-white dark:border-gray-900 sm:h-20 sm:w-20">
                        {logo ? (
                            <Image src={logo} alt={`${name} logo`} fill sizes="80px" className="bg-white object-cover" />
                        ) : seller ? (
                            <span className="font-display text-2xl font-bold uppercase" aria-hidden="true">
                                {name.charAt(0)}
                            </span>
                        ) : (
                            <Store className="h-7 w-7" aria-hidden="true" />
                        )}
                    </div>
                    <div className="min-w-0 pb-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h1 className="truncate text-lg font-bold leading-tight text-gray-900 dark:text-white sm:text-xl">
                                {name}
                            </h1>
                            {seller?.is_verified ? (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    Verified seller
                                </span>
                            ) : null}
                        </div>
                        <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                            {rating ? (
                                <li className="flex items-center gap-1">
                                    <RatingStars rating={rating.value} showValue />
                                    <span>
                                        ({rating.count.toLocaleString()} review{rating.count === 1 ? '' : 's'})
                                    </span>
                                </li>
                            ) : null}
                            <li className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                                {productCount.toLocaleString()} product{productCount === 1 ? '' : 's'}
                            </li>
                            {orders > 0 ? (
                                <li className="flex items-center gap-1">
                                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                                    {orders.toLocaleString()} order{orders === 1 ? '' : 's'}
                                </li>
                            ) : null}
                        </ul>
                    </div>
                </div>

                <div className="flex gap-2">
                    <a
                        href={whatsappHref(seller?.business_name ?? null, storeId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:h-10 sm:flex-none"
                    >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Contact via TradeHut
                    </a>
                    <ShareButton />
                </div>
            </div>

            {seller && seller.is_accepting_orders === false ? (
                <p className="border-t border-amber-200 bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 sm:px-4">
                    This store is not accepting new orders right now.
                </p>
            ) : null}
        </header>
    )
}
