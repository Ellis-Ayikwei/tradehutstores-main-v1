'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchPlacement, isDismissed, sendImpression, type AdPlacement } from '@/lib/ads'

interface UseAdOptions {
    /** Override current pathname for targeting (e.g. PDP category filtering). */
    path?: string
    /** A/B bucket if your app assigns one. */
    ab?: string
    /** Category IDs in scope (used by category-targeted ads). */
    categoryIds?: string[]
    /** Whether to auto-fire impression beacons for visible slots. Default: true. */
    trackImpressions?: boolean
    /** Whether to drop slots that have been dismissed locally. Default: true. */
    filterDismissed?: boolean
}

interface UseAdResult {
    placement: AdPlacement | null
    loading: boolean
    error: boolean
}

export function useAd(slug: string, opts: UseAdOptions = {}): UseAdResult {
    const [placement, setPlacement] = useState<AdPlacement | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<boolean>(false)
    const trackedRef = useRef<Set<string>>(new Set())

    const trackImpressions = opts.trackImpressions !== false
    const filterDismissed = opts.filterDismissed !== false

    useEffect(() => {
        const ctrl = new AbortController()
        let cancelled = false
        setLoading(true)
        setError(false)

        fetchPlacement(slug, { path: opts.path, ab: opts.ab, categoryIds: opts.categoryIds }, ctrl.signal)
            .then((p) => {
                if (cancelled) return
                if (!p) {
                    setPlacement(null)
                    return
                }
                if (filterDismissed) {
                    p = { ...p, slots: p.slots.filter((s) => !isDismissed(s.id)) }
                }
                setPlacement(p)
            })
            .catch(() => {
                if (cancelled) return
                setError(true)
                setPlacement(null)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
            ctrl.abort()
        }
    }, [slug, opts.path, opts.ab, opts.categoryIds?.join(','), filterDismissed])

    useEffect(() => {
        if (!trackImpressions || !placement) return
        for (const slot of placement.slots) {
            if (trackedRef.current.has(slot.id)) continue
            trackedRef.current.add(slot.id)
            sendImpression(slot.id)
        }
    }, [placement, trackImpressions])

    return { placement, loading, error }
}
