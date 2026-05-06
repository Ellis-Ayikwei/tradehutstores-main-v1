import { apiUrl } from '@/lib/config'

export type FxSnapshotResponse = {
    base_currency: string
    rates: Record<string, number>
    stale: boolean
    source: string
    as_of?: string
    snapshot_id?: string
}

export type FxQuoteResponse = {
    base_currency: string
    target_currency: string
    snapshot_id: string
    as_of?: string
    stale: boolean
    source: string
    snapshot_mismatch: boolean
    amounts: {
        subtotal: number
        shipping: number
        tax: number
        total: number
    }
    line_items: { line_total: number }[]
}

export type FxQuoteRequest = {
    target_currency: string
    snapshot_id?: string | null
    subtotal: number
    shipping: number
    tax: number
    line_items?: { unit_price: number; quantity: number }[]
}

export async function fetchFxSnapshot(): Promise<FxSnapshotResponse | null> {
    try {
        const r = await fetch(`${apiUrl}core/fx/snapshot/`, { credentials: 'include' })
        if (!r.ok) return null
        return await r.json()
    } catch {
        return null
    }
}

export async function postFxQuote(body: FxQuoteRequest): Promise<FxQuoteResponse | null> {
    try {
        const r = await fetch(`${apiUrl}core/fx/quote/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!r.ok) return null
        return await r.json()
    } catch {
        return null
    }
}
