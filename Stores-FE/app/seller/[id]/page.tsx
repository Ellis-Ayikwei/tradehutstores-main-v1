'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Store, Star, ShieldCheck, Package, ArrowLeft } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import { SellerPromosStrip } from '@/components/Promo'
import axiosInstance from '@/lib/axiosInstance'
import ProductCard from '@/components/Products/ProductCard'

interface SellerInfo {
    id: string
    business_name?: string
    username?: string
    business_description?: string
    rating?: number
    total_products?: number
    verified?: boolean
    avatar_url?: string | null
}

/**
 * Public seller storefront. The promo strip is the main NEW feature here —
 * it surfaces the seller's currently-live promo codes prominently so buyers
 * can copy them and apply at checkout.
 *
 * The seller and product fetches degrade gracefully — the promo strip works
 * regardless because it has its own dedicated endpoint
 * (/promos/store/<seller_id>/).
 */
export default function SellerStorefrontPage() {
    const params = useParams<{ id: string }>()
    const sellerId = params?.id || ''

    const [seller, setSeller] = useState<SellerInfo | null>(null)
    const [products, setProducts] = useState<unknown[] | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!sellerId) return
        let cancelled = false
        ;(async () => {
            setLoading(true)
            // Best-effort seller fetch — the seller details endpoint may not exist yet.
            try {
                const res = await axiosInstance.get(`/sellers/${sellerId}/`)
                if (!cancelled) setSeller(res.data as SellerInfo)
            } catch {
                if (!cancelled) setSeller({ id: sellerId, business_name: 'Seller Store' })
            }
            // Best-effort product fetch — params shape mirrors how PDP filters.
            try {
                const res = await axiosInstance.get(`/products/?seller=${sellerId}`)
                const list = Array.isArray(res.data)
                    ? res.data
                    : (res.data as { results?: unknown[] }).results ?? []
                if (!cancelled) setProducts(list)
            } catch {
                if (!cancelled) setProducts([])
            }
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [sellerId])

    if (!sellerId) {
        return (
            <MainLayout>
                <div className="min-h-screen flex items-center justify-center px-4 text-zinc-900 dark:text-white">
                    Missing seller id.
                </div>
            </MainLayout>
        )
    }

    const displayName = seller?.business_name || seller?.username || 'Seller'

    return (
        <MainLayout>
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
                    {/* Breadcrumb */}
                    <nav
                        aria-label="Breadcrumb"
                        className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-widest"
                    >
                        <Link
                            href="/"
                            className="hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Home
                        </Link>
                        <span>/</span>
                        <span>Sellers</span>
                        <span>/</span>
                        <span className="truncate text-zinc-900 dark:text-white">{displayName}</span>
                    </nav>

                    {/* Hero */}
                    <header className="rounded-3xl bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 p-6 md:p-8 shadow-sm">
                        <div className="flex items-start gap-5 flex-wrap">
                            <div
                                aria-hidden
                                className="shrink-0 h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white text-2xl md:text-3xl font-black uppercase shadow-lg"
                            >
                                {displayName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                        {displayName}
                                    </h1>
                                    {seller?.verified && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            <ShieldCheck className="h-3 w-3" />
                                            VERIFIED
                                        </span>
                                    )}
                                </div>
                                {seller?.business_description && (
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
                                        {seller.business_description}
                                    </p>
                                )}
                                <div className="mt-4 flex items-center gap-5 text-xs">
                                    {seller?.rating != null && (
                                        <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                            <strong className="text-zinc-900 dark:text-white">
                                                {seller.rating.toFixed(1)}
                                            </strong>
                                        </span>
                                    )}
                                    {products && (
                                        <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                            <Package className="h-3.5 w-3.5" />
                                            <strong className="text-zinc-900 dark:text-white">
                                                {products.length}
                                            </strong>
                                            <span>products</span>
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                        <Store className="h-3.5 w-3.5" />
                                        TradeHut store
                                    </span>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Promo strip — the new feature */}
                    <SellerPromosStrip sellerId={sellerId} sellerName={displayName} />

                    {/* Products */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
                                Products
                            </h2>
                            {products && products.length > 0 && (
                                <span className="text-xs text-zinc-500">
                                    {products.length} item{products.length === 1 ? '' : 's'}
                                </span>
                            )}
                        </div>
                        {loading ? (
                            <div className="text-center py-16 text-sm text-zinc-500">
                                Loading products…
                            </div>
                        ) : !products || products.length === 0 ? (
                            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-neutral-700 bg-white/40 dark:bg-neutral-900/40">
                                <Package className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    No products yet
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    This seller hasn't listed any items.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {products.map((p, idx) => (
                                    <ProductCard
                                        key={(p as { id?: string }).id ?? idx}
                                        product={p as never}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </MainLayout>
    )
}
