'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Share2 } from 'lucide-react'

type Status = 'idle' | 'copied' | 'failed'

/** Copies the store URL (without ?tab) to the clipboard. */
export default function ShareButton() {
    const [status, setStatus] = useState<Status>('idle')
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current)
        },
        []
    )

    const onClick = async () => {
        const url = new URL(window.location.href)
        url.searchParams.delete('tab')
        url.hash = ''
        let next: Status = 'copied'
        try {
            await navigator.clipboard.writeText(url.toString())
        } catch {
            next = 'failed'
        }
        setStatus(next)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setStatus('idle'), 2500)
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 sm:h-10"
        >
            {status === 'copied' ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            ) : (
                <Share2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{status === 'copied' ? 'Link copied' : status === 'failed' ? 'Copy failed' : 'Share'}</span>
            <span className="sr-only" role="status" aria-live="polite">
                {status === 'copied' ? 'Store link copied to clipboard' : status === 'failed' ? 'Could not copy the link' : ''}
            </span>
        </button>
    )
}
