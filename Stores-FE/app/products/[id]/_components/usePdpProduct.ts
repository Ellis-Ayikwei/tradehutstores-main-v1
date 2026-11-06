'use client'

import useSWR, { type KeyedMutator } from 'swr'
import axiosInstance from '@/lib/axiosInstance'
import { mapReviewFromApi } from '@/lib/reviewUtils'
import { asRecord, normalizeProduct, str } from './pdpUtils'
import type { PdpProduct, SellerInfo } from './types'

export interface PdpData {
  product: PdpProduct
  related: PdpProduct[]
}

export class PdpNotFoundError extends Error {
  constructor() {
    super('Product not found')
    this.name = 'PdpNotFoundError'
  }
}

function statusOf(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status
}

function rows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const r = asRecord(data)
  return r && Array.isArray(r.results) ? (r.results as unknown[]) : []
}

async function fetchPdp(id: string): Promise<PdpData> {
  let productRes
  try {
    productRes = await axiosInstance.get(`/products/${id}/`)
  } catch (e) {
    if (statusOf(e) === 404) throw new PdpNotFoundError()
    throw e
  }
  const [variantsRes, imagesRes, relatedRes, reviewsRes] = await Promise.all([
    axiosInstance.get(`/products/${id}/variants/`),
    axiosInstance.get(`/products/${id}/images/`),
    axiosInstance.get(`/products/${id}/related/`).catch(() => ({ data: [] })),
    axiosInstance.get(`reviews/?product=${id}`).catch(() => ({ data: [] })),
  ])
  const raw = asRecord(productRes.data)
  if (!raw || raw.id == null) throw new PdpNotFoundError()

  const reviews = rows(reviewsRes.data).map(mapReviewFromApi)
  const product = normalizeProduct(raw, variantsRes.data, imagesRes.data, reviews)
  const related = rows(relatedRes.data)
    .map(asRecord)
    .filter((r): r is Record<string, unknown> => r !== null && r.id != null)
    .map(r => normalizeProduct(r))
    .filter(p => p.id !== product.id)
  return { product, related }
}

export function usePdpProduct(id: string): {
  data: PdpData | undefined
  error: unknown
  isLoading: boolean
  mutate: KeyedMutator<PdpData>
} {
  const { data, error, isLoading, mutate } = useSWR<PdpData>(id ? ['pdp', id] : null, () => fetchPdp(id), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return { data, error, isLoading, mutate }
}

/**
 * Public seller details. `GET sellers/<id>/` is not implemented on the backend yet, so this
 * resolves to null today; the name/verified flag are only shown when the API provides them.
 */
export function useSellerInfo(product: PdpProduct | undefined): SellerInfo | null {
  const profileId = product?.seller_profile ?? null
  const { data } = useSWR<{ name: string | null; verified: boolean | null } | null>(
    profileId && !product?.seller_name ? ['pdp-seller', profileId] : null,
    async () => {
      try {
        const res = await axiosInstance.get(`sellers/${encodeURIComponent(profileId as string)}/`)
        const r = asRecord(res.data)
        if (!r) return null
        return { name: str(r.business_name), verified: typeof r.is_verified === 'boolean' ? r.is_verified : null }
      } catch {
        return null
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  if (!profileId || !product) return null
  return {
    id: profileId,
    name: product.seller_name ?? data?.name ?? null,
    verified: product.seller_verified ?? data?.verified ?? false,
  }
}
