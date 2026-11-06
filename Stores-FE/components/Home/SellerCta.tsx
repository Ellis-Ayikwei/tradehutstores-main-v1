import Link from 'next/link'
import { ArrowRight, Store } from 'lucide-react'
import { HOME_CONTAINER } from './HomeSection'

export default function SellerCta() {
    return (
        <section aria-label="Sell on TradeHut" className={`${HOME_CONTAINER} mt-8 pb-8`}>
            <div className="flex flex-col items-start gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-orange-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div className="flex items-start gap-4">
                    <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-700 sm:flex">
                        <Store className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                        <h2 className="font-syne text-xl font-bold sm:text-2xl">Sell on TradeHut</h2>
                        <p className="mt-1 max-w-xl text-sm text-white/80">
                            Open your store, list products, run auctions and answer RFQs. Reach buyers across the
                            marketplace.
                        </p>
                    </div>
                </div>
                <Link
                    href="/sell"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-neutral-900 hover:bg-orange-100 sm:w-auto"
                >
                    Start selling
                    <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
            </div>
        </section>
    )
}
