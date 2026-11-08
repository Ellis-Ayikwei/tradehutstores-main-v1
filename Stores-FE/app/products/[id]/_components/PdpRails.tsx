'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import useSWR from 'swr'
import { ProductRail } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import axiosInstance from '@/lib/axiosInstance'
import { asRecord, normalizeProduct, toMarketplaceProduct } from './pdpUtils'
import type { PdpProduct, SellerInfo } from './types'

const MAX_ITEMS = 12

function rowsOf(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const r = asRecord(data)
  return r && Array.isArray(r.results) ? (r.results as unknown[]) : []
}

async function fetchProducts(path: string): Promise<PdpProduct[]> {
  const res = await axiosInstance.get(path)
  return rowsOf(res.data)
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => r !== null && r.id != null)
    .map(r => normalizeProduct(r))
}

/** True once the sentinel is within `margin` of the viewport; stays true afterwards. */
function useNearViewport(margin = '600px'): [RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: `${margin} 0px` }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [near, margin])
  return [ref, near]
}

/** Renders `children(true)` only after the block scrolls near the viewport, so below-the-fold rails cost nothing up front. */
function LazyBlock({ children }: { children: ReactNode }) {
  const [ref, near] = useNearViewport()
  return (
    <div ref={ref}>
      {near ? children : null}
    </div>
  )
}

const cap = (items: PdpProduct[]) => items.slice(0, MAX_ITEMS).map(toMarketplaceProduct)

/** "Products related to this item": the product's `related/` endpoint (same category, best rated first). */
export function RelatedRail({ items, category }: { items: PdpProduct[]; category: string | null }) {
  const { formatDisplayPrice } = useCurrency()
  const cards = useMemo(() => cap(items), [items])
  return (
    <ProductRail
      title="Products related to this item"
      items={cards}
      formatPrice={formatDisplayPrice}
      seeAllHref={category ? `/products?category=${encodeURIComponent(category)}` : undefined}
      seeAllLabel={category ? `See more in ${category}` : undefined}
    />
  )
}

function BrandSellerInner({ product, seller }: { product: PdpProduct; seller: SellerInfo | null }) {
  const { formatDisplayPrice } = useCurrency()
  const wantsBrand = Boolean(product.brand_id)
  const wantsSeller = Boolean(product.seller_profile)
  // `GET products/` has no brand/seller filter and is unpaginated, so one shared read is filtered here.
  const { data, error, isLoading } = useSWR<PdpProduct[]>(
    wantsBrand || wantsSeller ? 'pdp-all-products' : null,
    () => fetchProducts('/products/'),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const { brandItems, sellerItems } = useMemo(() => {
    const others = (data ?? []).filter(p => p.id !== product.id && p.available)
    return {
      brandItems: wantsBrand ? cap(others.filter(p => p.brand_id === product.brand_id)) : [],
      sellerItems: wantsSeller ? cap(others.filter(p => p.seller_profile === product.seller_profile)) : [],
    }
  }, [data, product.id, product.brand_id, product.seller_profile, wantsBrand, wantsSeller])

  const failed = Boolean(error)
  return (
    <>
      {wantsBrand && product.brand ? (
        <ProductRail
          title={`More from ${product.brand}`}
          items={brandItems}
          loading={isLoading}
          error={failed && !wantsSeller}
          formatPrice={formatDisplayPrice}
          seeAllHref={`/products?search=${encodeURIComponent(product.brand)}`}
          seeAllLabel={`See all ${product.brand}`}
        />
      ) : null}
      {wantsSeller ? (
        <ProductRail
          title={seller?.name ? `More from ${seller.name}` : 'More from this seller'}
          items={sellerItems}
          loading={isLoading}
          error={failed}
          formatPrice={formatDisplayPrice}
          seeAllHref={seller ? `/seller/${encodeURIComponent(seller.id)}` : undefined}
          seeAllLabel="Visit the store"
        />
      ) : null}
    </>
  )
}

/** "More from this brand" and "More from this seller"; fetched only when scrolled near, hidden when empty. */
export function BrandSellerRails({ product, seller }: { product: PdpProduct; seller: SellerInfo | null }) {
  if (!product.brand_id && !product.seller_profile) return null
  return (
    <LazyBlock>
      <BrandSellerInner product={product} seller={seller} />
    </LazyBlock>
  )
}

function DealsInner({ product }: { product: PdpProduct }) {
  const { formatDisplayPrice } = useCurrency()
  const { data, error, isLoading } = useSWR<PdpProduct[]>(
    product.category_id ? 'pdp-deals' : null,
    () => fetchProducts('/products/discounted/'),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  const items = useMemo(
    () =>
      cap(
        (data ?? [])
          .filter(p => p.id !== product.id && p.available && p.discount_percentage > 0 && p.category_id === product.category_id)
          .sort((a, b) => b.discount_percentage - a.discount_percentage)
      ),
    [data, product.id, product.category_id]
  )
  return (
    <ProductRail
      title="Deals on related products"
      items={items}
      loading={isLoading}
      error={Boolean(error)}
      formatPrice={formatDisplayPrice}
      seeAllHref={product.category ? `/products?category=${encodeURIComponent(product.category)}` : undefined}
      seeAllLabel={product.category ? `See more in ${product.category}` : undefined}
    />
  )
}

/** Discounted products of the same category (`products/discounted/`), biggest discount first. */
export function DealsRail({ product }: { product: PdpProduct }) {
  if (!product.category_id) return null
  return (
    <LazyBlock>
      <DealsInner product={product} />
    </LazyBlock>
  )
}
