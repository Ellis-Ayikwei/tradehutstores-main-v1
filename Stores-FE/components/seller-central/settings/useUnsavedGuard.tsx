'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import { btnDanger, btnSecondary } from '@/components/seller-central/ui'

function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
    const ref = useRef<HTMLDivElement>(null)
    useDialogA11y(true, ref, onStay)
    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center">
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-labelledby="unsaved-title"
                aria-describedby="unsaved-desc"
                className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
                <h2 id="unsaved-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Leave without saving?
                </h2>
                <p id="unsaved-desc" className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    You have changes that have not been saved. If you leave now they will be lost.
                </p>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onStay} className={btnSecondary}>
                        Keep editing
                    </button>
                    <button type="button" onClick={onLeave} className={btnDanger}>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    )
}

/**
 * Unsaved-changes guard for the App Router (it has no route blocker):
 *  - browser close / reload / external navigation: the native `beforeunload` prompt,
 *  - in-app link clicks to another path: intercepted in the capture phase and confirmed in a dialog.
 * Same-path changes (the settings tabs only change the query string) are not blocked.
 * The browser Back button is not intercepted.
 */
export function useUnsavedGuard(dirty: boolean): { dialog: ReactNode } {
    const router = useRouter()
    const [pending, setPending] = useState<string | null>(null)

    useEffect(() => {
        if (!dirty) return
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [dirty])

    useEffect(() => {
        if (!dirty) return
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const target = e.target instanceof Element ? e.target : null
            const anchor = target?.closest<HTMLAnchorElement>('a[href]')
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
            let url: URL
            try {
                url = new URL(anchor.href, window.location.href)
            } catch {
                return
            }
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
            e.preventDefault()
            e.stopPropagation()
            setPending(`${url.pathname}${url.search}${url.hash}`)
        }
        document.addEventListener('click', onClick, true)
        return () => document.removeEventListener('click', onClick, true)
    }, [dirty])

    const dialog = pending ? (
        <LeaveDialog
            onStay={() => setPending(null)}
            onLeave={() => {
                const href = pending
                setPending(null)
                router.push(href)
            }}
        />
    ) : null

    return { dialog }
}
