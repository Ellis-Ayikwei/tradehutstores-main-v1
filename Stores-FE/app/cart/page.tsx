'use client'

import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import MainLayout from '@/components/Layouts/MainLayout'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ShieldCheck, Truck } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useCurrency } from '@/contexts/CurrencyContext'
import { removeFromCart, updateCart } from '@/store/cartSlice'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { PromoCodeInput } from '@/components/Promo'
import type { PromoResult } from '@/hooks/usePromo'

// ─── Config ────────────────────────────────────────────────────────────────────
// Move these to env/config if they come from backend eventually
const TAX_RATE = 0.15
const FREE_SHIPPING_THRESHOLD = 500
const FLAT_SHIPPING_COST = 50

// ─── Types ─────────────────────────────────────────────────────────────────────
// Mirror your actual CartItem shape from the Redux slice.
// Adjust fields here if your slice type differs — don't use `any` downstream.
interface CartProduct {
    name: string
    brand?: string
    final_price?: number
    price?: number
    main_product_image?: string
    image?: string
}

interface CartLine {
    id: string | number
    quantity: number
    product: CartProduct
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Safely resolve unit price from a cart item */
const getUnitPrice = (item: CartLine): number => {
    const raw = item.product.final_price ?? item.product.price ?? 0
    return Number(raw) || 0
}

/**
 * Normalize inconsistent image fields into a single src string.
 * Centralising this here means you fix the API inconsistency in one place.
 */
const getProductImage = (product: CartProduct): string => {
    const raw = product.main_product_image || product.image || '/placeholder.png'
    if (raw === '/placeholder.png') return raw
    return resolveMediaSrc(raw) || '/placeholder.png'
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CartPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatDisplayPrice } = useCurrency()

    const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null)
    // Track which cart item IDs are mid-update to prevent concurrent dispatches
    const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set())

    // ─── Derived totals ──────────────────────────────────────────────────────
    const lines = cart.items as unknown as CartLine[]
    const subtotal = lines.reduce((acc: number, item) => {
        return acc + getUnitPrice(item) * (Number(item.quantity) || 0)
    }, 0)

    const promoDiscount = appliedPromo?.valid ? parseFloat(appliedPromo.discount_amount || '0') : 0
    const subtotalAfterPromo = Math.max(0, subtotal - promoDiscount)
    const promoFreeShipping = !!appliedPromo?.free_shipping
    const shipping =
        promoFreeShipping || subtotalAfterPromo > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST
    const tax = subtotalAfterPromo * TAX_RATE
    const total = subtotalAfterPromo + shipping + tax

    // ─── Handlers ────────────────────────────────────────────────────────────
    /**
     * Wrap async dispatches with a per-item loading guard.
     * Prevents duplicate quantity requests from rapid clicking.
     */
    const withLoadingGuard = async (
        itemId: string | number,
        action: () => Promise<unknown> | unknown
    ) => {
        if (updatingIds.has(itemId)) return
        setUpdatingIds((prev) => new Set(prev).add(itemId))
        try {
            await action()
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev)
                next.delete(itemId)
                return next
            })
        }
    }

    const handleDecrement = (item: CartLine) =>
        withLoadingGuard(item.id, () => {
            if (item.quantity <= 1) {
                return dispatch(removeFromCart({ cartItemId: String(item.id) }))
            }
            return dispatch(updateCart({ cartItemId: String(item.id), quantity: item.quantity - 1 }))
        })

    const handleIncrement = (item: CartLine) =>
        withLoadingGuard(item.id, () =>
            dispatch(updateCart({ cartItemId: String(item.id), quantity: item.quantity + 1 }))
        )

    const handleRemove = (item: CartLine) =>
        withLoadingGuard(item.id, () =>
            dispatch(removeFromCart({ cartItemId: String(item.id) }))
        )

    // ─── Empty state ─────────────────────────────────────────────────────────
    if (cart.items.length === 0) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-white dark:bg-gray-950">
                    <ShoppingCart size={48} className="text-zinc-200 dark:text-neutral-700 mb-4" />
                    <h1 className="font-syne text-2xl font-bold text-zinc-900 dark:text-neutral-100 mb-6">
                        YOUR CART IS EMPTY
                    </h1>
                    <Link
                        href="/products"
                        className="bg-black dark:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        RETURN TO SHOP <ArrowRight size={18} />
                    </Link>
                </div>
            </MainLayout>
        )
    }

    // ─── Main render ─────────────────────────────────────────────────────────
    return (
        <MainLayout>
            {/*
              pb-28 on mobile reserves space for the sticky checkout bar.
              lg:pb-20 reverts once the sidebar checkout button takes over.
            */}
            <div className="bg-white dark:bg-gray-950 min-h-screen pb-28 lg:pb-20">
                <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-10">
                    <h1 className="font-syne text-2xl md:text-3xl font-black text-zinc-900 dark:text-neutral-100 mb-6 md:mb-10 uppercase tracking-tighter">
                        My Cart
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                        {/* ── Cart items ───────────────────────────────────── */}
                        <div className="lg:col-span-7">
                            {lines.map((item) => {
                                const unitPrice = getUnitPrice(item)
                                const isUpdating = updatingIds.has(item.id)

                                return (
                                    <div
                                        key={item.id}
                                        className={`py-5 border-b border-zinc-100 dark:border-neutral-800 transition-opacity ${
                                            isUpdating ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                    >
                                        {/* Row 1: image + info + trash */}
                                        <div className="flex gap-3 md:gap-4 items-start">
                                            <div className="relative w-20 h-24 md:w-24 md:h-32 bg-zinc-100 dark:bg-neutral-800 rounded flex-shrink-0">
                                                <Image
                                                    src={getProductImage(item.product)}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover rounded"
                                                    unoptimized
                                                />
                                            </div>

                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    {/* Name + brand + unit price — stacked, no horizontal crowding */}
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-zinc-900 dark:text-neutral-100 uppercase text-sm leading-tight line-clamp-2">
                                                            {item.product.name}
                                                        </h3>
                                                        <p className="text-[10px] text-zinc-400 dark:text-neutral-500 uppercase mt-1 tracking-widest">
                                                            {item.product.brand || 'Tradehut'}
                                                        </p>
                                                        <span className="font-mono text-zinc-400 dark:text-neutral-500 text-xs mt-2 block">
                                                            {formatDisplayPrice(unitPrice)} ea
                                                        </span>
                                                    </div>

                                                    {/* Trash top-right of text block — easy thumb reach on mobile */}
                                                    <button
                                                        onClick={() => handleRemove(item)}
                                                        className="flex-shrink-0 text-zinc-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 active:text-red-600 transition-colors disabled:opacity-20 p-1 -mt-1 -mr-1"
                                                        disabled={isUpdating}
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/*
                                          Row 2: qty stepper + line total
                                          Left-padded to align under text, not image.
                                          w-20 (5rem) + gap-3 (0.75rem) = 5.75rem
                                          md: w-24 (6rem) + gap-4 (1rem) = 7rem
                                        */}
                                        <div className="flex items-center justify-between mt-3 pl-[5.75rem] md:pl-[7rem]">
                                            <div className="flex items-center border border-zinc-300 dark:border-neutral-600 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
                                                <button
                                                    onClick={() => handleDecrement(item)}
                                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-neutral-800 active:bg-zinc-200 dark:active:bg-neutral-700 text-zinc-900 dark:text-neutral-100 disabled:opacity-20"
                                                    disabled={isUpdating}
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <span className="px-3 md:px-4 text-zinc-900 dark:text-neutral-100 font-mono font-bold text-sm min-w-[2rem] text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleIncrement(item)}
                                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-neutral-800 active:bg-zinc-200 dark:active:bg-neutral-700 text-zinc-900 dark:text-neutral-100 disabled:opacity-20"
                                                    disabled={isUpdating}
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>

                                            {/* Line total — prominent, updates live */}
                                            <span className="font-mono font-black text-zinc-900 dark:text-neutral-100 text-base">
                                                {formatDisplayPrice(unitPrice * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* ── Order summary sidebar ─────────────────────────── */}
                        <aside className="lg:col-span-5">
                            <div className="bg-zinc-50 dark:bg-neutral-900 p-5 md:p-8 rounded-2xl border border-zinc-100 dark:border-neutral-800 lg:sticky lg:top-10">
                                <h2 className="font-syne text-xl font-bold mb-5 md:mb-6 uppercase text-zinc-900 dark:text-neutral-100">
                                    Summary
                                </h2>

                                {/* Promo code */}
                                <div className="mb-6 md:mb-8">
                                    <PromoCodeInput
                                        cart={{
                                            subtotal,
                                            item_count: lines.length,
                                            item_ids: lines
                                                .map((l) => String((l as { id?: string | number }).id ?? ''))
                                                .filter(Boolean),
                                        }}
                                        initial={appliedPromo}
                                        onChange={setAppliedPromo}
                                    />
                                </div>

                                {/* Line items */}
                                <div className="space-y-3 md:space-y-4 text-sm font-medium">
                                    <div className="flex justify-between border-b border-zinc-200 dark:border-neutral-700 pb-3 md:pb-4 text-zinc-500 dark:text-neutral-400">
                                        <span className="uppercase">Subtotal</span>
                                        <span className="text-zinc-900 dark:text-neutral-100 font-mono font-bold">
                                            {formatDisplayPrice(subtotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-200 dark:border-neutral-700 pb-3 md:pb-4 text-zinc-500 dark:text-neutral-400">
                                        <span className="uppercase">Logistics</span>
                                        <span className="text-zinc-900 dark:text-neutral-100 font-mono font-bold">
                                            {shipping === 0 ? 'FREE' : formatDisplayPrice(shipping)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-200 dark:border-neutral-700 pb-3 md:pb-4 text-zinc-500 dark:text-neutral-400">
                                        <span className="uppercase">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                                        <span className="text-zinc-900 dark:text-neutral-100 font-mono font-bold">
                                            {formatDisplayPrice(tax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-zinc-900 dark:text-neutral-100 font-black uppercase text-lg">Total</span>
                                        <span className="text-zinc-900 dark:text-neutral-100 font-mono font-black text-2xl tracking-tighter">
                                            {formatDisplayPrice(total)}
                                        </span>
                                    </div>
                                </div>

                                {/* Checkout button — hidden on mobile (sticky bar handles it) */}
                                <Link
                                    href="/checkout"
                                    className="mt-8 hidden lg:block w-full bg-black dark:bg-white text-white dark:text-neutral-900 text-center py-5 rounded-xl font-bold uppercase tracking-[0.1em] hover:bg-zinc-800 dark:hover:bg-neutral-200 transition-all shadow-lg"
                                >
                                    Secure Checkout
                                </Link>

                                {/* Trust signals */}
                                <div className="mt-5 md:mt-6 flex items-center justify-center gap-6 text-[10px] text-zinc-400 dark:text-neutral-500 uppercase tracking-widest">
                                    <span className="flex items-center gap-1">
                                        <ShieldCheck size={12} /> Secure
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Truck size={12} />
                                        {`Free over ${formatDisplayPrice(FREE_SHIPPING_THRESHOLD)}`}
                                    </span>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            {/*
              ── Sticky mobile checkout bar ──────────────────────────────────
              Visible only below lg — replaces the sidebar checkout button.
              env(safe-area-inset-bottom) handles iPhone home indicator padding.
            */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-zinc-100 dark:border-neutral-800 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 dark:text-neutral-400 uppercase font-bold tracking-widest">Total</span>
                    <span className="font-mono font-black text-zinc-900 dark:text-neutral-100 text-xl tracking-tighter">
                        {formatDisplayPrice(total)}
                    </span>
                </div>
                <Link
                    href="/checkout"
                    className="block w-full bg-black dark:bg-white text-white dark:text-neutral-900 text-center py-4 rounded-xl font-bold uppercase tracking-[0.1em] active:bg-zinc-800 dark:active:bg-neutral-200 transition-all"
                >
                    Secure Checkout
                </Link>
            </div>
        </MainLayout>
    )
}