'use client'

import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'

interface PickerSheetProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

/**
 * Bottom sheet used by the ship-to and currency pickers below lg. Portalled to
 * <body> so it is never clipped by (or stacked under) the sticky header or the
 * transformed mobile drawer. Solid surfaces; the scrim is the only alpha.
 */
export default function PickerSheet({ open, onClose, title, children }: PickerSheetProps) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    // Focus trap, Esc (topmost dialog only), scroll lock and focus return to the opener.
    useDialogA11y(open, dialogRef, onClose, closeRef)

    if (!open || typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-[500]">
            <button
                type="button"
                tabIndex={-1}
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 h-full w-full bg-black/50"
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[80vh] w-full max-w-lg flex-col pb-[env(safe-area-inset-bottom)] rounded-t-md border-t border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 pl-4 dark:border-zinc-800">
                    <h2 className="text-base font-bold">{title}</h2>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-11 w-11 items-center justify-center text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    )
}
