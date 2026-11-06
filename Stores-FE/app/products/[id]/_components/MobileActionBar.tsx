'use client'

import type { PurchaseModel } from './usePurchase'

/**
 * Sticky bottom bar (< lg). It is the last element of the page content and uses `sticky`
 * so it pins to the viewport bottom while the product is on screen but never covers the footer.
 */
export default function MobileActionBar({ purchase }: { purchase: PurchaseModel }) {
  const unavailable = !purchase.stock.inStock
  return (
    <div className="sticky bottom-0 z-40 -mx-3 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 pb-[env(safe-area-inset-bottom)] sm:-mx-4 lg:hidden">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={purchase.addToCart}
          disabled={unavailable || purchase.adding}
          className="h-11 flex-1 rounded-full bg-primary-700 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
        >
          {unavailable ? 'Out of stock' : purchase.adding ? 'Adding...' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={purchase.buyNow}
          disabled={unavailable}
          className="h-11 flex-1 rounded-full bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-zinc-100 dark:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
        >
          Buy now
        </button>
      </div>
    </div>
  )
}
