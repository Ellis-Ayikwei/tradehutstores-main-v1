'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

/** TradeHut support line, international format without "+" (wa.me needs digits only). */
const SUPPORT_WHATSAPP = '233248138722'

interface WhatsAppAssistProps {
    /** Order numbers shown to the customer, e.g. ["#04453BC8"]. They are put into the message so support can find the order. */
    orderNumbers?: string[]
    /** Open the pop-up by itself shortly after the page loads (once per browser session per order). Default true. */
    autoOpen?: boolean
}

const storageKey = (numbers: string[]) => `th:wa-assist:${numbers.join(',') || 'general'}`

/**
 * Floating "chat with us on WhatsApp" button with a small pop-up: "Get assistance with this order on WhatsApp".
 * Tapping the button opens WhatsApp with a message that already names the order. Dismissing the pop-up keeps it
 * closed for the rest of the session; the button stays so help is always one tap away.
 */
export default function WhatsAppAssist({ orderNumbers = [], autoOpen = true }: WhatsAppAssistProps) {
    const [open, setOpen] = useState(false)
    const key = storageKey(orderNumbers)

    useEffect(() => {
        if (!autoOpen) return
        let dismissed = false
        try {
            dismissed = window.sessionStorage.getItem(key) === 'dismissed'
        } catch {
            /* storage unavailable (private mode): just show it once per page view */
        }
        if (dismissed) return
        const timer = window.setTimeout(() => setOpen(true), 1500)
        return () => window.clearTimeout(timer)
    }, [autoOpen, key])

    const close = () => {
        setOpen(false)
        try {
            window.sessionStorage.setItem(key, 'dismissed')
        } catch {
            /* ignore */
        }
    }

    const about = orderNumbers.length === 0 ? 'my order' : orderNumbers.length === 1 ? `my order ${orderNumbers[0]}` : `my orders ${orderNumbers.join(', ')}`
    const href = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi TradeHut, I need help with ${about}.`)}`
    const label = orderNumbers.length === 1 ? 'this order' : orderNumbers.length > 1 ? 'these orders' : 'your order'

    return (
        <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 print:hidden">
            {open ? (
                <section
                    role="dialog"
                    aria-label="Get assistance on WhatsApp"
                    className="w-72 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">Need help with {label}?</p>
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Close"
                            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                    <p className="mt-1">Get assistance with {label} on WhatsApp. We reply fast, and your order number is already in the message.</p>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus-visible:ring-offset-zinc-900"
                    >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Chat on WhatsApp
                    </a>
                </section>
            ) : null}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? 'Close WhatsApp help' : 'Get assistance on WhatsApp'}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus-visible:ring-offset-zinc-950"
            >
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </button>
        </div>
    )
}
