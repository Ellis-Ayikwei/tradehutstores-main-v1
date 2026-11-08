'use client'

import { useRef, type ReactNode } from 'react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import { useUnsavedGuard as useSharedUnsavedGuard } from '@/hooks/useUnsavedGuard'
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
 * Unsaved-changes guard for the settings forms: the shared guard (`beforeunload`, in-app link clicks and the
 * browser Back button) plus this screen's confirm dialog. The settings tabs only change the query string via
 * `router.replace`, which is not a link click, so switching tabs is never blocked.
 */
export function useUnsavedGuard(dirty: boolean): { dialog: ReactNode } {
    const guard = useSharedUnsavedGuard(dirty)
    const dialog = guard.confirmOpen ? <LeaveDialog onStay={guard.stay} onLeave={guard.leave} /> : null
    return { dialog }
}
