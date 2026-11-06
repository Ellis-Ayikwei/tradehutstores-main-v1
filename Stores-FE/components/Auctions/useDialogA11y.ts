'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0)
}

/**
 * Accessibility behaviour for modal sheets (no dependencies):
 * - moves focus into the dialog when it opens (initial ref, else the first focusable),
 * - traps Tab / Shift+Tab inside the dialog,
 * - closes on Escape,
 * - locks body scroll while open,
 * - returns focus to the element that opened it (the trigger) on close.
 */
export function useDialogA11y(
    open: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onClose: () => void,
    initialFocusRef?: RefObject<HTMLElement | null>
) {
    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    })

    useEffect(() => {
        if (!open) return
        const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const container = containerRef.current
        if (container) {
            const first = initialFocusRef?.current ?? focusables(container)[0]
            first?.focus()
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onCloseRef.current()
                return
            }
            if (e.key !== 'Tab') return
            const root = containerRef.current
            if (!root) return
            const items = focusables(root)
            if (items.length === 0) {
                e.preventDefault()
                return
            }
            const firstEl = items[0]
            const lastEl = items[items.length - 1]
            const active = document.activeElement
            if (!root.contains(active)) {
                e.preventDefault()
                firstEl.focus()
            } else if (e.shiftKey && active === firstEl) {
                e.preventDefault()
                lastEl.focus()
            } else if (!e.shiftKey && active === lastEl) {
                e.preventDefault()
                firstEl.focus()
            }
        }
        document.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
            if (trigger && trigger.isConnected) trigger.focus()
        }
        // containerRef / initialFocusRef are stable ref objects.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])
}
