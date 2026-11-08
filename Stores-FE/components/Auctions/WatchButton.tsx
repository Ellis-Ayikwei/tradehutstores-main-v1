'use client'

import { useEffect, useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { setWatching, toApiError } from '@/lib/auctionsApi'

interface WatchButtonProps {
    auctionId: string
    title: string
    isWatching: boolean
    onChange?: (watching: boolean) => void
    /** icon: 32px bordered square (44px tap target via ::before), for cards. button: full-width labelled button, for the bid panel. */
    variant?: 'icon' | 'button'
    className?: string
}

const FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-900'

const HEART_ON = 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400'

/** Optimistic watch toggle (A7). Anonymous users get the auth modal instead of a failed request. */
export default function WatchButton({
    auctionId,
    title,
    isWatching,
    onChange,
    variant = 'icon',
    className = '',
}: WatchButtonProps) {
    const isAuthenticated = useIsAuthenticated()
    const [watching, setWatchingState] = useState(isWatching)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        setWatchingState(isWatching)
    }, [isWatching])

    const toggle = async () => {
        if (busy) return
        if (!isAuthenticated) {
            tryOpenAuthModalFromBridge('login')
            return
        }
        const next = !watching
        setWatchingState(next)
        setBusy(true)
        try {
            const res = await setWatching(auctionId, next)
            setWatchingState(res.is_watching)
            onChange?.(res.is_watching)
        } catch (err) {
            setWatchingState(!next)
            if (toApiError(err).status === 401) tryOpenAuthModalFromBridge('login')
        } finally {
            setBusy(false)
        }
    }

    const label = watching ? `Stop watching ${title}` : `Watch ${title}`

    if (variant === 'button') {
        return (
            <button
                type="button"
                onClick={toggle}
                aria-pressed={watching}
                aria-label={label}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 ${FOCUS} ${className}`}
            >
                {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                    <Heart className={`h-4 w-4 ${watching ? HEART_ON : 'text-zinc-700 dark:text-zinc-300'}`} aria-hidden="true" />
                )}
                {watching ? 'Watching' : 'Watch this auction'}
            </button>
        )
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={watching}
            aria-label={label}
            className={`${/\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative '}flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 before:absolute before:-inset-1.5 before:content-[''] hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${FOCUS} ${className}`}
        >
            <Heart className={`h-4 w-4 ${watching ? HEART_ON : ''}`} aria-hidden="true" />
        </button>
    )
}
