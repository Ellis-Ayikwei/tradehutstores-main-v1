'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Unsaved-changes guard for the App Router (which has no `useBlocker`):
 *  - `beforeunload` for tab close / reload / external navigation,
 *  - a capture-phase click listener that intercepts in-app links (nav, breadcrumbs) and asks first,
 *  - a history trap so the browser Back button asks first too.
 * `requestLeave(fn)` runs `fn` straight away when clean, or after the seller confirms. `leaveNow(fn)` skips the question (used after a save).
 */
export function useUnsavedGuard(dirty: boolean) {
    const router = useRouter()
    const [pending, setPending] = useState<{ fn: () => void; unwind: boolean } | null>(null)
    const dirtyRef = useRef(dirty)
    const allowRef = useRef(false)
    const trappedRef = useRef(false)

    useEffect(() => {
        dirtyRef.current = dirty
    }, [dirty])

    // beforeunload
    useEffect(() => {
        if (!dirty) return
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (allowRef.current) return
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [dirty])

    // In-app links
    useEffect(() => {
        if (!dirty) return
        const onClick = (e: MouseEvent) => {
            if (allowRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
            if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
            const url = new URL(anchor.href, window.location.href)
            if (url.origin !== window.location.origin) return
            if (url.pathname + url.search === window.location.pathname + window.location.search) return
            e.preventDefault()
            e.stopPropagation()
            const target = url.pathname + url.search + url.hash
            setPending({ fn: () => router.push(target), unwind: true })
        }
        document.addEventListener('click', onClick, true)
        return () => document.removeEventListener('click', onClick, true)
    }, [dirty, router])

    // Browser Back button
    useEffect(() => {
        if (!dirty) return
        if (!trappedRef.current) {
            window.history.pushState({ sellerListingsGuard: true }, '', window.location.href)
            trappedRef.current = true
        }
        const onPop = () => {
            if (allowRef.current || !dirtyRef.current) return
            // We are now on the entry before the trap: put the trap back and ask.
            window.history.pushState({ sellerListingsGuard: true }, '', window.location.href)
            setPending({
                fn: () => {
                    allowRef.current = true
                    window.history.go(-2)
                },
                unwind: false,
            })
        }
        window.addEventListener('popstate', onPop)
        return () => window.removeEventListener('popstate', onPop)
    }, [dirty])

    const runAfterUntrap = useCallback((fn: () => void) => {
        allowRef.current = true
        if (trappedRef.current) {
            trappedRef.current = false
            window.addEventListener('popstate', () => fn(), { once: true })
            window.history.back()
        } else {
            fn()
        }
    }, [])

    const requestLeave = useCallback(
        (fn: () => void) => {
            if (!dirtyRef.current) fn()
            else setPending({ fn, unwind: true })
        },
        []
    )

    const leaveNow = useCallback((fn: () => void) => runAfterUntrap(fn), [runAfterUntrap])

    const stay = useCallback(() => setPending(null), [])

    const leave = useCallback(() => {
        const item = pending
        setPending(null)
        if (!item) return
        // A Back-button leave walks history itself; link and cancel leaves unwind the trap entry first.
        if (item.unwind) runAfterUntrap(item.fn)
        else item.fn()
    }, [pending, runAfterUntrap])

    return { confirmOpen: pending !== null, stay, leave, requestLeave, leaveNow }
}
