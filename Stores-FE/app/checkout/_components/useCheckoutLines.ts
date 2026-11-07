'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import axiosInstance from '@/lib/axiosInstance'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { variantDisplayLabel, type LabelableVariant } from '@/lib/variantLabel'
import { fetchOrder, moneyToNumber, toCheckoutError } from '@/lib/checkoutApi'
import type { OrderDetail } from '@/lib/checkoutApi'
import { normaliseCartLine } from './cartLines'
import type { RawCartLine } from './cartLines'
import type { CheckoutLine, CheckoutMode, LinesStatus } from './types'

interface Params {
    mode: CheckoutMode
    productId: string | null
    variantId: string | null
    qtyParam: string | null
    orderId: string | null
    /** Order mode needs a signed-in user; other modes do not. */
    authed: boolean
    hydrated: boolean
}

interface Result {
    status: LinesStatus
    error: string | null
    lines: CheckoutLine[]
    order: OrderDetail | null
    reload: () => void
}

type ApiRecord = Record<string, unknown>

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)

function asList(data: unknown): ApiRecord[] {
    if (Array.isArray(data)) return data as ApiRecord[]
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
        return (data as { results: ApiRecord[] }).results
    }
    return []
}

/** Same rule as the product page: variant price, less the product-level discount. */
function buyNowUnitPrice(product: ApiRecord, variant: ApiRecord | null): number | undefined {
    const disc = Number(product.discount_percentage ?? 0)
    const discount = Number.isFinite(disc) ? disc : 0
    if (variant) {
        const base = moneyToNumber(variant.price)
        if (base === null) return undefined
        return discount > 0 ? base * (1 - discount / 100) : base
    }
    return moneyToNumber(product.final_price) ?? moneyToNumber(product.price) ?? undefined
}

export function useCheckoutLines({ mode, productId, variantId, qtyParam, orderId, authed, hydrated }: Params): Result {
    const cartItems = useSelector((s: RootState) => s.cart.cart.items)
    const [tick, setTick] = useState(0)
    const reload = useCallback(() => setTick((t) => t + 1), [])

    const cartLines = useMemo<CheckoutLine[]>(
        () =>
            (cartItems as unknown as RawCartLine[]).map((raw) => {
                const l = normaliseCartLine(raw)
                return {
                    key: l.id,
                    cartLineId: l.id,
                    productId: l.productId,
                    variantId: l.variantId,
                    name: l.name,
                    href: l.href,
                    imageSrc: l.imageSrc,
                    unit: l.unit,
                    list: l.list,
                    quantity: l.quantity,
                    variantText: l.variantText,
                    soldBy: l.soldBy,
                    outOfStock: l.outOfStock,
                }
            }),
        [cartItems]
    )

    const [remote, setRemote] = useState<{
        status: LinesStatus
        error: string | null
        lines: CheckoutLine[]
        order: OrderDetail | null
    }>({ status: 'loading', error: null, lines: [], order: null })

    // ── Buy now: one line built from the URL params ──────────────────────────
    useEffect(() => {
        if (mode !== 'buynow' || !productId) return
        let cancelled = false
        setRemote({ status: 'loading', error: null, lines: [], order: null })
        const qtyRaw = parseInt(qtyParam || '1', 10)
        const quantity = Math.max(1, Math.min(99, Number.isFinite(qtyRaw) ? qtyRaw : 1))

        void (async () => {
            try {
                const [productRes, variantsRes] = await Promise.all([
                    axiosInstance.get(`/products/${encodeURIComponent(productId)}/`),
                    axiosInstance.get(`/products/${encodeURIComponent(productId)}/variants/`),
                ])
                const product = productRes.data as ApiRecord
                const variants = asList(variantsRes.data)
                let variant: ApiRecord | null = variantId
                    ? (variants.find((v) => String(v.id) === String(variantId)) ?? null)
                    : null
                if (!variant && variants.length === 1) variant = variants[0]

                if (variants.length > 0 && !variant) {
                    if (!cancelled) {
                        setRemote({
                            status: 'error',
                            error: 'This product has options. Open the product page and choose one first.',
                            lines: [],
                            order: null,
                        })
                    }
                    return
                }

                const mainImg = product.main_product_image
                const image =
                    typeof mainImg === 'string' ? mainImg : str((mainImg as { url?: unknown } | null)?.url) ?? str(product.image) ?? ''
                const line: CheckoutLine = {
                    key: `buy-now-${productId}-${variantId ?? 'default'}`,
                    productId,
                    variantId: variant ? String(variant.id) : undefined,
                    name: str(product.name) ?? 'Product',
                    href: `/products/${productId}`,
                    imageSrc: resolveMediaSrc(image),
                    unit: buyNowUnitPrice(product, variant),
                    quantity,
                    variantText: (variant ? variantDisplayLabel(variant as LabelableVariant) : null) ?? undefined,
                    soldBy: str(product.store_name),
                }
                if (!cancelled) setRemote({ status: 'ready', error: null, lines: [line], order: null })
            } catch {
                if (!cancelled) {
                    setRemote({
                        status: 'error',
                        error: 'We could not load this product for checkout.',
                        lines: [],
                        order: null,
                    })
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [mode, productId, variantId, qtyParam, tick])

    // ── Pay an existing order (auction win / RFQ award) ──────────────────────
    useEffect(() => {
        if (mode !== 'order' || !orderId) return
        if (!authed) {
            setRemote({ status: 'ready', error: null, lines: [], order: null })
            return
        }
        let cancelled = false
        setRemote({ status: 'loading', error: null, lines: [], order: null })
        fetchOrder(orderId)
            .then((order) => {
                if (cancelled) return
                const lines: CheckoutLine[] = (order.items ?? []).map((item, i) => ({
                    key: `${item.variant_id ?? item.product_id ?? 'item'}-${i}`,
                    productId: item.product_id ?? '',
                    variantId: item.variant_id,
                    name: item.title || 'Item',
                    href: item.product_id ? `/products/${item.product_id}` : '/products',
                    imageSrc: resolveMediaSrc(item.image ?? ''),
                    unit: moneyToNumber(item.unit_price) ?? undefined,
                    quantity: Math.max(1, Number(item.quantity) || 1),
                    // Order rows carry only a SKU, which is not buyer-facing; no variant label is shown until the API sends one.
                    soldBy: order.seller?.business_name,
                }))
                setRemote({ status: 'ready', error: null, lines, order })
            })
            .catch((err: unknown) => {
                if (cancelled) return
                const e = toCheckoutError(err)
                setRemote({
                    status: 'error',
                    error:
                        e.status === 404
                            ? 'We could not find that order. It may belong to a different account.'
                            : 'We could not load this order. Please try again.',
                    lines: [],
                    order: null,
                })
            })
        return () => {
            cancelled = true
        }
    }, [mode, orderId, authed, tick])

    if (mode === 'cart') {
        return { status: hydrated ? 'ready' : 'loading', error: null, lines: cartLines, order: null, reload }
    }
    return { ...remote, reload }
}
