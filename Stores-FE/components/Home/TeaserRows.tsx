import Link from 'next/link'
import { ArrowRight, Gavel, FileText } from 'lucide-react'
import { HOME_CONTAINER } from './HomeSection'

/**
 * Static teasers for Bid Central and RFQ.
 * Purely link-driven: no endpoints are called, so there is nothing to load or fail.
 * When the auctions/RFQ APIs ship, replace the copy with live rows.
 */
export default function TeaserRows() {
    return (
        <section aria-label="Auctions and quotes" className={`${HOME_CONTAINER} mt-6`}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Link
                    href="/auctions"
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-neutral-900 p-4 text-white sm:p-5"
                >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500">
                        <Gavel className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                            Bid Central
                        </span>
                        <span className="block font-syne text-base font-bold sm:text-lg">
                            Live auctions ending soon
                        </span>
                        <span className="block text-xs text-neutral-300 sm:text-sm">
                            Bid on real deals before the clock runs out.
                        </span>
                    </span>
                    <ArrowRight
                        className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                        aria-hidden
                    />
                </Link>

                <Link
                    href="/rfq"
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white sm:p-5"
                >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                        <FileText className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                            Request for quote
                        </span>
                        <span className="block font-syne text-base font-bold sm:text-lg">
                            Open RFQs: get suppliers to quote
                        </span>
                        <span className="block text-xs text-neutral-600 dark:text-neutral-300 sm:text-sm">
                            Post what you need and compare offers.
                        </span>
                    </span>
                    <ArrowRight
                        className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                        aria-hidden
                    />
                </Link>
            </div>
        </section>
    )
}
