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

interface CartItem {
    id: string | number
    quantity: number
    product: CartProduct
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Safely resolve unit price from a cart item */
const getUnitPrice = (item: CartItem): number => {
    const raw = item.product.final_price ?? item.product.price ?? 0
    return Number(raw) || 0
}

/**
 * Normalize inconsistent image fields into a single src string.
 * Centralising this here means you fix the API inconsistency in one place.
 */
const getProductImage = (product: CartProduct): string =>
    product.main_product_image || product.image || '/placeholder.png'

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CartPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatCurrency } = useCurrency()

    const [promoCode, setPromoCode] = useState('')
    // Track which cart item IDs are mid-update to prevent concurrent dispatches
    const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set())

    // ─── Derived totals ──────────────────────────────────────────────────────
    const subtotal = cart.items.reduce((acc, item: CartItem) => {
        return acc + getUnitPrice(item) * (Number(item.quantity) || 0)
    }, 0)

    const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST
    const tax = subtotal * TAX_RATE
    const total = subtotal + shipping + tax

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

    const handleDecrement = (item: CartItem) =>
        withLoadingGuard(item.id, () => {
            if (item.quantity <= 1) {
                // Remove outright rather than letting quantity hit 0
                return dispatch(removeFromCart({ cartItemId: item.id }))
            }
            return dispatch(updateCart({ cartItemId: item.id, quantity: item.quantity - 1 }))
        })

    const handleIncrement = (item: CartItem) =>
        withLoadingGuard(item.id, () =>
            dispatch(updateCart({ cartItemId: item.id, quantity: item.quantity + 1 }))
        )

    const handleRemove = (item: CartItem) =>
        withLoadingGuard(item.id, () =>
            dispatch(removeFromCart({ cartItemId: item.id }))
        )

    // ─── Empty state ─────────────────────────────────────────────────────────
    if (cart.items.length === 0) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-white">
                    <ShoppingCart size={48} className="text-zinc-200 mb-4" />
                    <h1 className="font-syne text-2xl font-bold text-zinc-900 mb-6">
                        YOUR CART IS EMPTY
                    </h1>
                    <Link
                        href="/products"
                        className="bg-black text-white px-8 py-4 rounded-full font-bold flex items-center gap-2"
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
            <div className="bg-white min-h-screen pb-28 lg:pb-20">
                <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-10">
                    <h1 className="font-syne text-2xl md:text-3xl font-black text-zinc-900 mb-6 md:mb-10 uppercase tracking-tighter">
                        My Cart
                    </h1>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                        {/* ── Cart items ───────────────────────────────────── */}
                        <div className="lg:col-span-7">
                            {(cart.items as CartItem[]).map((item) => {
                                const unitPrice = getUnitPrice(item)
                                const isUpdating = updatingIds.has(item.id)

                                return (
                                    <div
                                        key={item.id}
                                        className={`py-5 border-b border-zinc-100 transition-opacity ${
                                            isUpdating ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                    >
                                        {/* Row 1: image + info + trash */}
                                        <div className="flex gap-3 md:gap-4 items-start">
                                            <div className="relative w-20 h-24 md:w-24 md:h-32 bg-zinc-100 rounded flex-shrink-0">
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
                                                        <h3 className="font-bold text-zinc-900 uppercase text-sm leading-tight line-clamp-2">
                                                            {item.product.name}
                                                        </h3>
                                                        <p className="text-[10px] text-zinc-400 uppercase mt-1 tracking-widest">
                                                            {item.product.brand || 'Tradehut'}
                                                        </p>
                                                        <span className="font-mono text-zinc-400 text-xs mt-2 block">
                                                            {formatCurrency(unitPrice)} ea
                                                        </span>
                                                    </div>

                                                    {/* Trash top-right of text block — easy thumb reach on mobile */}
                                                    <button
                                                        onClick={() => handleRemove(item)}
                                                        className="flex-shrink-0 text-zinc-300 hover:text-red-500 active:text-red-600 transition-colors disabled:opacity-20 p-1 -mt-1 -mr-1"
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
                                            <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-white">
                                                <button
                                                    onClick={() => handleDecrement(item)}
                                                    className="p-2 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 disabled:opacity-20"
                                                    disabled={isUpdating}
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <span className="px-3 md:px-4 text-zinc-900 font-mono font-bold text-sm min-w-[2rem] text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleIncrement(item)}
                                                    className="p-2 hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 disabled:opacity-20"
                                                    disabled={isUpdating}
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>

                                            {/* Line total — prominent, updates live */}
                                            <span className="font-mono font-black text-zinc-900 text-base">
                                                {formatCurrency(unitPrice * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* ── Order summary sidebar ─────────────────────────── */}
                        <aside className="lg:col-span-5">
                            <div className="bg-zinc-50 p-5 md:p-8 rounded-2xl border border-zinc-100 lg:sticky lg:top-10">
                                <h2 className="font-syne text-xl font-bold mb-5 md:mb-6 uppercase text-zinc-900">
                                    Summary
                                </h2>

                                {/* Promo code — wired up when backend is ready */}
                                <div className="mb-6 md:mb-8">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-2 block tracking-widest">
                                        Promotion Code
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="CODE"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            className="flex-grow bg-white border border-zinc-200 rounded-lg py-3 px-4 text-xs font-bold text-zinc-900 focus:border-black outline-none transition-all uppercase"
                                        />
                                        <button
                                            className="bg-zinc-200 text-zinc-900 px-4 py-3 rounded-lg font-bold text-xs hover:bg-zinc-300 transition-colors uppercase disabled:opacity-40"
                                            disabled={!promoCode.trim()}
                                            // TODO: wire up promo code API call
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                {/* Line items */}
                                <div className="space-y-3 md:space-y-4 text-sm font-medium">
                                    <div className="flex justify-between border-b border-zinc-200 pb-3 md:pb-4 text-zinc-500">
                                        <span className="uppercase">Subtotal</span>
                                        <span className="text-zinc-900 font-mono font-bold">
                                            {formatCurrency(subtotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-200 pb-3 md:pb-4 text-zinc-500">
                                        <span className="uppercase">Logistics</span>
                                        <span className="text-zinc-900 font-mono font-bold">
                                            {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-zinc-200 pb-3 md:pb-4 text-zinc-500">
                                        <span className="uppercase">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                                        <span className="text-zinc-900 font-mono font-bold">
                                            {formatCurrency(tax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-zinc-900 font-black uppercase text-lg">Total</span>
                                        <span className="text-zinc-900 font-mono font-black text-2xl tracking-tighter">
                                            {formatCurrency(total)}
                                        </span>
                                    </div>
                                </div>

                                {/* Checkout button — hidden on mobile (sticky bar handles it) */}
                                <Link
                                    href="/checkout"
                                    className="mt-8 hidden lg:block w-full bg-black text-white text-center py-5 rounded-xl font-bold uppercase tracking-[0.1em] hover:bg-zinc-800 transition-all shadow-lg"
                                >
                                    Secure Checkout
                                </Link>

                                {/* Trust signals */}
                                <div className="mt-5 md:mt-6 flex items-center justify-center gap-6 text-[10px] text-zinc-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1">
                                        <ShieldCheck size={12} /> Secure
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Truck size={12} />
                                        {`Free over ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`}
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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-100 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Total</span>
                    <span className="font-mono font-black text-zinc-900 text-xl tracking-tighter">
                        {formatCurrency(total)}
                    </span>
                </div>
                <Link
                    href="/checkout"
                    className="block w-full bg-black text-white text-center py-4 rounded-xl font-bold uppercase tracking-[0.1em] active:bg-zinc-800 transition-all"
                >
                    Secure Checkout
                </Link>
            </div>
        </MainLayout>
    )
}