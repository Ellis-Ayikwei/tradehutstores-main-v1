'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const TRAP_MARK = 'sellerUnsavedGuard'
const isTrapState = () => Boolean((window.history.state as Record<string, unknown> | null)?.[TRAP_MARK])

/**
 * Unsaved-changes guard for the App Router (which has no `useBlocker`), shared by the listing wizard and store settings:
 *  - `beforeunload` for tab close / reload / external navigation,
 *  - a capture-phase click listener that intercepts in-app links (nav, breadcrumbs) and asks first,
 *  - a history trap so the browser Back button asks first too. The trap exists only while `dirty` is true.
 * `requestLeave(fn)` runs `fn` straight away when clean, or after the seller confirms. `leaveNow(fn)` skips the question (used after a save).
 */
export function useUnsavedGuard(dirty: boolean) {
    const router = useRouter()
    const [pending, setPending] = useState<{ fn: () => void; unwind: boolean } | null>(null)
    const dirtyRef = useRef(dirty)
    const allowRef = useRef(false)
    const trappedRef = useRef(false)
    const skipPopRef = useRef(false)

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
            let url: URL
            try {
                url = new URL(anchor.href, window.location.href)
            } catch {
                return
            }
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

    // Browser Back button: add the trap entry while dirty, drop it again when clean.
    useEffect(() => {
        if (dirty) {
            if (!trappedRef.current) {
                window.history.pushState({ [TRAP_MARK]: true }, '', window.location.href)
                trappedRef.current = true
            }
        } else if (trappedRef.current) {
            trappedRef.current = false
            if (isTrapState()) {
                skipPopRef.current = true
                window.history.back()
            }
        }
    }, [dirty])

    useEffect(() => {
        const onPop = () => {
            if (skipPopRef.current) {
                skipPopRef.current = false
                return
            }
            if (allowRef.current || !trappedRef.current || !dirtyRef.current) return
            // We are now on the entry before the trap: put the trap back and ask.
            window.history.pushState({ [TRAP_MARK]: true }, '', window.location.href)
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
    }, [])

    const runAfterUntrap = useCallback((fn: () => void) => {
        allowRef.current = true
        // Only step back over the trap entry if it is still the current one; if the seller already pressed Back
        // (for example during a save) another history.back() would leave the site and `fn` would never run.
        if (trappedRef.current && isTrapState()) {
            trappedRef.current = false
            window.addEventListener('popstate', () => fn(), { once: true })
            window.history.back()
        } else {
            trappedRef.current = false
            fn()
        }
    }, [])

    const requestLeave = useCallback((fn: () => void) => {
        if (!dirtyRef.current) fn()
        else setPending({ fn, unwind: true })
    }, [])

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
