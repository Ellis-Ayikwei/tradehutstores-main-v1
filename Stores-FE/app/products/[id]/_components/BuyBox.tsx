'use client'

import Link from 'next/link'
import { BadgeCheck, Heart, Lock, RotateCcw, Truck } from 'lucide-react'
import PriceBlock from './PriceBlock'
import type { PdpProduct, SellerInfo } from './types'
import type { PurchaseModel } from './usePurchase'

export function StockLine({ stock }: { stock: PurchaseModel['stock'] }) {
  if (!stock.inStock) return <p className="text-base font-medium text-red-600 dark:text-red-400">Out of stock</p>
  if (stock.low) return <p className="text-base font-medium text-red-600 dark:text-red-400">Only {stock.quantity} left in stock</p>
  return <p className="text-base font-medium text-green-700 dark:text-green-400">In stock</p>
}

export function DeliveryLine({ freeShipping }: { freeShipping: boolean | null }) {
  if (freeShipping === null) return null
  return (
    <p className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
      <Truck className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
      {freeShipping ? (
        <span className="font-semibold text-green-700 dark:text-green-400">Free delivery</span>
      ) : (
        <span>Delivery fee is calculated at checkout</span>
      )}
    </p>
  )
}

export function QuantitySelect({
  purchase,
  id,
  className = '',
}: {
  purchase: PurchaseModel
  id: string
  className?: string
}) {
  if (!purchase.stock.inStock) return null
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm text-zinc-700 dark:text-zinc-300">
        Qty:
      </label>
      <select
        id={id}
        value={purchase.quantity}
        onChange={e => purchase.setQuantity(Number(e.target.value))}
        className="h-10 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 [color-scheme:light] dark:[color-scheme:dark] px-2 text-base text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 lg:h-9 lg:text-sm"
      >
        {Array.from({ length: purchase.maxQuantity }, (_, i) => i + 1).map(n => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SellerLine({ seller }: { seller: SellerInfo | null }) {
  if (!seller) return null
  return (
    <p className="text-sm text-zinc-700 dark:text-zinc-300">
      Sold by{' '}
      <Link href={`/seller/${encodeURIComponent(seller.id)}`} className="font-medium text-primary-700 dark:text-primary-400 hover:underline">
        {seller.name ?? 'View seller store'}
      </Link>
      {seller.verified ? (
        <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <BadgeCheck className="h-3.5 w-3.5 text-primary-700 dark:text-primary-400" aria-hidden />
          Verified seller
        </span>
      ) : null}
    </p>
  )
}

interface BuyBoxProps {
  product: PdpProduct
  purchase: PurchaseModel
  seller: SellerInfo | null
}

export default function BuyBox({ product, purchase, seller }: BuyBoxProps) {
  const unavailable = !purchase.stock.inStock
  return (
    <aside
      aria-label="Buy box"
      className="hidden space-y-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 lg:sticky lg:top-40 lg:block lg:self-start"
    >
      <PriceBlock info={purchase.price} size="md" />
      <DeliveryLine freeShipping={product.free_shipping} />
      <StockLine stock={purchase.stock} />
      {purchase.needsVariant ? <p className="text-sm text-zinc-600 dark:text-zinc-400">Select an option to continue.</p> : null}
      <QuantitySelect purchase={purchase} id="pdp-qty-desktop" />

      <div className="space-y-2">
        <button
          type="button"
          onClick={purchase.addToCart}
          disabled={unavailable || purchase.adding}
          className="h-9 w-full rounded-full bg-primary-700 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
        >
          {purchase.adding ? 'Adding...' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={purchase.buyNow}
          disabled={unavailable}
          className="h-9 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
        >
          Buy now
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Secure checkout
      </p>

      <hr className="border-zinc-200 dark:border-zinc-800" />
      <SellerLine seller={seller} />
      <p className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
        <RotateCcw className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
        <span>
          Returns:{' '}
          <Link href="/returns" className="text-primary-700 dark:text-primary-400 hover:underline">
            see our returns policy
          </Link>
        </span>
      </p>

      <hr className="border-zinc-200 dark:border-zinc-800" />
      <button
        type="button"
        onClick={purchase.toggleWishlist}
        aria-pressed={purchase.wishlisted}
        className="flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-sm text-zinc-800 dark:text-zinc-200 hover:text-primary-700 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
      >
        <Heart className={`h-4 w-4 ${purchase.wishlisted ? 'fill-red-600 dark:fill-red-400 text-red-600 dark:text-red-400' : ''}`} aria-hidden />
        {purchase.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      </button>
    </aside>
  )
}
