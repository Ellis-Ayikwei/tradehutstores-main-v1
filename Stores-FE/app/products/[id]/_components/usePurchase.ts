'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { wishlistItemProductId } from '@/lib/wishlistUtils'
import { round2 } from './pdpUtils'
import {
  findVariantForSelections,
  isVariantInStock,
  nextSelections,
  parseVariationThemeAxes,
  variantsMatchThemeAxes,
} from './variantUtils'
import type { PdpProduct, PdpVariant, PriceInfo, StockInfo } from './types'

export type ShowToast = (msg: string, type: 'success' | 'error') => void

const MAX_QTY = 10

export interface PurchaseModel {
  themeAxes: string[] | null
  useAxisPicker: boolean
  selections: Record<string, string>
  selectedVariant: PdpVariant | null
  /** Variants exist but none is chosen yet. */
  needsVariant: boolean
  price: PriceInfo
  stock: StockInfo
  quantity: number
  maxQuantity: number
  adding: boolean
  wishlisted: boolean
  selectAxis: (axis: string, value: string) => void
  selectVariant: (variant: PdpVariant | null) => void
  setQuantity: (n: number) => void
  addToCart: () => void
  buyNow: () => void
  toggleWishlist: () => void
}

export function usePurchase(product: PdpProduct, showToast: ShowToast): PurchaseModel {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const cartId = useSelector((s: RootState) => s.cart.cart.id)
  const wishlistItems = useSelector((s: RootState) => s.wishlist.wishlist.items)

  const themeAxes = useMemo(() => parseVariationThemeAxes(product.variation_theme), [product.variation_theme])
  const useAxisPicker = useMemo(
    () => Boolean(themeAxes && product.variants.length > 0 && variantsMatchThemeAxes(product.variants, themeAxes)),
    [themeAxes, product.variants]
  )

  const [selections, setSelections] = useState<Record<string, string>>({})
  const [flatVariantId, setFlatVariantId] = useState<string | null>(
    !useAxisPicker && product.variants.length === 1 ? product.variants[0].id : null
  )
  const [quantity, setQuantityState] = useState(1)
  const [adding, setAdding] = useState(false)

  const selectedVariant = useMemo<PdpVariant | null>(() => {
    if (product.variants.length === 0) return null
    if (useAxisPicker && themeAxes) {
      if (!themeAxes.every(ax => Boolean(selections[ax]))) return null
      return findVariantForSelections(product.variants, themeAxes, selections)
    }
    return product.variants.find(v => v.id === flatVariantId) ?? null
  }, [product.variants, useAxisPicker, themeAxes, selections, flatVariantId])

  const selectAxis = useCallback(
    (axis: string, value: string) => setSelections(prev => nextSelections(product.variants, prev, axis, value)),
    [product.variants]
  )
  const selectVariant = useCallback((v: PdpVariant | null) => setFlatVariantId(v ? v.id : null), [])

  // ── price ────────────────────────────────────────────────────────────────
  const price = useMemo<PriceInfo>(() => {
    const d = product.discount_percentage
    const apply = (base: number) => (d > 0 ? round2(base * (1 - d / 100)) : base)
    if (selectedVariant) {
      const base = Number(selectedVariant.price) || 0
      return { price: apply(base), maxPrice: null, listPrice: d > 0 ? base : null, discountPct: d }
    }
    const prices = product.variants.map(v => Number(v.price) || 0).filter(p => p > 0)
    if (prices.length > 1) {
      const lo = Math.min(...prices)
      const hi = Math.max(...prices)
      if (lo !== hi) return { price: apply(lo), maxPrice: apply(hi), listPrice: null, discountPct: d }
    }
    return { price: product.final_price, maxPrice: null, listPrice: d > 0 ? product.price : null, discountPct: d }
  }, [product, selectedVariant])

  // ── stock ────────────────────────────────────────────────────────────────
  const stock = useMemo<StockInfo>(() => {
    let quantityLeft: number | null
    if (selectedVariant) quantityLeft = selectedVariant.quantity
    else if (product.variants.length > 0) {
      const known = product.variants.filter(v => v.quantity != null)
      quantityLeft =
        product.variant_stock_total ??
        (known.length > 0 ? known.reduce((sum, v) => sum + (v.quantity ?? 0), 0) : product.inventory_level)
    } else quantityLeft = product.variant_stock_total ?? product.inventory_level
    const inStock = product.available && (quantityLeft == null || quantityLeft > 0)
    return { quantity: quantityLeft, inStock, low: inStock && quantityLeft != null && quantityLeft <= 5 }
  }, [product, selectedVariant])

  const maxQuantity = stock.quantity != null ? Math.max(1, Math.min(stock.quantity, MAX_QTY)) : MAX_QTY

  useEffect(() => {
    setQuantityState(q => Math.min(Math.max(1, q), maxQuantity))
  }, [maxQuantity])

  const setQuantity = useCallback((n: number) => setQuantityState(Math.min(Math.max(1, n), maxQuantity)), [maxQuantity])

  const needsVariant = product.variants.length > 0 && !selectedVariant

  // ── wishlist ─────────────────────────────────────────────────────────────
  const existingWishlistItem = (wishlistItems ?? []).find(
    (item: { product?: unknown }) => wishlistItemProductId(item) === product.id
  )
  const wishlisted = Boolean(existingWishlistItem)

  const toggleWishlist = useCallback(() => {
    if (existingWishlistItem) {
      dispatch(removeFromWishlist({ wishlistItemId: String(existingWishlistItem.id) }))
        .unwrap()
        .then(() => showToast('Removed from wishlist', 'success'))
        .catch(() => showToast('Could not update wishlist', 'error'))
      return
    }
    dispatch(addToWishlist({ product_id: product.id }))
      .unwrap()
      .then(() => showToast('Added to wishlist', 'success'))
      .catch(() => showToast('Failed to add to wishlist', 'error'))
  }, [dispatch, existingWishlistItem, product.id, showToast])

  // ── cart / buy now ───────────────────────────────────────────────────────
  const cartProduct = useMemo(
    () => ({
      ...product,
      price: String(selectedVariant ? Number(selectedVariant.price) || 0 : product.price),
      final_price: price.price,
      image: product.main_product_image || product.images[0] || '',
      main_product_image: product.main_product_image || product.images[0] || '',
    }),
    [product, selectedVariant, price.price]
  )

  const guardVariant = useCallback((): boolean => {
    if (needsVariant) {
      showToast('Please select an option first', 'error')
      document.getElementById('pdp-variants')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    if (selectedVariant && !isVariantInStock(selectedVariant)) {
      showToast('This option is out of stock', 'error')
      return false
    }
    return true
  }, [needsVariant, selectedVariant, showToast])

  const handleAddToCart = useCallback(() => {
    if (adding || !guardVariant()) return
    setAdding(true)
    dispatch(
      addToCart({
        cart_id: cartId || undefined,
        product_id: product.id,
        quantity,
        product_variant_id: selectedVariant?.id,
        product: cartProduct,
        variant: selectedVariant,
      })
    )
      .unwrap()
      .then(() => showToast('Added to cart', 'success'))
      .catch(() => showToast('Failed to add to cart', 'error'))
      .finally(() => setAdding(false))
  }, [adding, guardVariant, dispatch, cartId, product.id, quantity, selectedVariant, cartProduct, showToast])

  const handleBuyNow = useCallback(() => {
    if (!guardVariant()) return
    const q = new URLSearchParams({ buyNow: '1', product: product.id, qty: String(quantity) })
    if (selectedVariant) q.set('variant', selectedVariant.id)
    router.push(`/checkout?${q.toString()}`)
  }, [guardVariant, product.id, quantity, selectedVariant, router])

  return {
    themeAxes,
    useAxisPicker,
    selections,
    selectedVariant,
    needsVariant,
    price,
    stock,
    quantity,
    maxQuantity,
    adding,
    wishlisted,
    selectAxis,
    selectVariant,
    setQuantity,
    addToCart: handleAddToCart,
    buyNow: handleBuyNow,
    toggleWishlist,
  }
}
