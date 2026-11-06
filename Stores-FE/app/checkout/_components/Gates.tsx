'use client'

import Link from 'next/link'
import { LogIn, PackageOpen, ShoppingCart } from 'lucide-react'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { BTN_PRIMARY, CARD, FOCUS } from './ui'

const SK = 'bg-zinc-200 dark:bg-zinc-700'

export function CheckoutSkeleton() {
    return (
        <div
            role="status"
            aria-label="Loading checkout"
            className="animate-pulse space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(0,1fr)_380px]"
        >
            <div className="space-y-3 lg:space-y-4">
                <div className={`${CARD} h-12 lg:hidden`} />
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`${CARD} p-3 sm:p-4`}>
                        <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-full ${SK}`} />
                            <div className={`h-5 w-44 rounded ${SK}`} />
                        </div>
                        {i === 0 ? (
                            <div className="mt-3 space-y-2">
                                <div className="h-[72px] rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                                <div className="h-[72px] rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
            <div className={`${CARD} hidden space-y-3 p-4 lg:block`}>
                <div className={`h-12 w-full rounded-full ${SK}`} />
                <div className={`h-3 w-4/5 rounded ${SK}`} />
                <div className={`h-5 w-1/2 rounded ${SK}`} />
                <div className={`h-4 w-full rounded ${SK}`} />
                <div className={`h-4 w-full rounded ${SK}`} />
                <div className={`h-6 w-full rounded ${SK}`} />
            </div>
        </div>
    )
}

export function SignInGate({ hasItems }: { hasItems: boolean }) {
    const open = () => {
        if (!tryOpenAuthModalFromBridge('login') && typeof window !== 'undefined') {
            window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        }
    }
    return (
        <div className={`${CARD} p-4 sm:p-6`}>
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <LogIn className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-syne text-lg font-bold text-zinc-900 dark:text-zinc-100">Sign in to continue</h2>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {hasItems
                            ? 'Sign in to choose your delivery address and place your order. Your cart is saved.'
                            : 'Sign in to choose your delivery address and place your order.'}
                    </p>
                    <button type="button" onClick={open} className={`${BTN_PRIMARY} mt-3 w-full sm:w-auto`}>
                        Sign in to continue
                    </button>
                </div>
            </div>
        </div>
    )
}

export function EmptyCheckout() {
    return (
        <div className={`flex flex-col items-center ${CARD} px-4 py-8 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-2 font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100">Your cart is empty</h1>
            <p className="mt-1 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                Add something to your cart, or buy a single item from a product page.
            </p>
            <Link href="/products" className={`${BTN_PRIMARY} mt-3 px-6`}>
                Continue shopping
            </Link>
        </div>
    )
}

export function LoadError({ message, onRetry, backHref, backLabel }: { message: string; onRetry?: () => void; backHref: string; backLabel: string }) {
    return (
        <div className={`flex flex-col items-center ${CARD} px-4 py-8 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                <PackageOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-2 font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100">We couldn’t load your order</h1>
            <p role="alert" className="mt-1 max-w-sm text-sm text-zinc-700 dark:text-zinc-300">
                {message}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {onRetry ? (
                    <button type="button" onClick={onRetry} className={BTN_PRIMARY}>
                        Try again
                    </button>
                ) : null}
                <Link
                    href={backHref}
                    className={`inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 ${FOCUS}`}
                >
                    {backLabel}
                </Link>
            </div>
        </div>
    )
}
