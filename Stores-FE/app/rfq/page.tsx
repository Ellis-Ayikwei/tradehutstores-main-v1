import type { Metadata } from 'next'
import { ClipboardList, FileText, Handshake, Lock } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import RFQForm from '@/components/RFQ/RFQForm'

export const metadata: Metadata = {
    title: 'Request a quote | TradeHut',
    description: 'Post what you need, receive private quotes from suppliers and award the one you choose.',
}

const STEPS = [
    { Icon: ClipboardList, title: 'Post a request', text: 'Describe what you need and when.' },
    { Icon: FileText, title: 'Receive quotes', text: 'Suppliers send you private prices.' },
    { Icon: Handshake, title: 'Choose a supplier', text: 'Award one quote and pay for the order.' },
]

export default function RFQPage() {
    return (
        <MainLayout>
            <main className="bg-zinc-50 dark:bg-zinc-950">
                <section className="bg-zinc-900 text-white dark:border-b dark:border-zinc-800" aria-labelledby="rfq-heading">
                    <div className="mx-auto flex max-w-screen-xl flex-col gap-1 px-3 py-4 sm:px-4 sm:py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
                        <div>
                            <h1 id="rfq-heading" className="font-syne text-xl font-bold leading-tight sm:text-2xl lg:text-3xl">
                                Request a quote
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-zinc-300 sm:text-base">
                                Tell suppliers what you need. They send you prices, you pick the one you want.
                            </p>
                        </div>
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            Quotes are visible only to you and the supplier who sent them
                        </p>
                    </div>
                </section>

                <section aria-label="How it works" className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <ol className="mx-auto grid max-w-screen-xl grid-cols-3 gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3 lg:px-6">
                        {STEPS.map(({ Icon, title, text }, i) => (
                            <li key={title} className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white sm:h-9 sm:w-9">
                                    <span className="sr-only">Step </span>
                                    {i + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 text-[13px] font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-sm">
                                        <Icon className="hidden h-4 w-4 shrink-0 text-primary-700 dark:text-primary-400 sm:block" aria-hidden="true" />
                                        {title}
                                    </p>
                                    <p className="mt-0.5 hidden text-xs leading-snug text-zinc-600 dark:text-zinc-400 sm:block">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <RFQForm />
            </main>
        </MainLayout>
    )
}
