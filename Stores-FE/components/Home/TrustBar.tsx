import Link from 'next/link'
import { Phone, RotateCcw, ShieldCheck } from 'lucide-react'
import { HOME_CONTAINER } from './HomeSection'

const ITEMS = [
    { icon: ShieldCheck, title: 'Buyer protection', text: 'How we protect your order', href: '/buyer-protection' },
    { icon: RotateCcw, title: 'Returns', text: 'See the returns process', href: '/returns' },
    { icon: Phone, title: 'Need help?', text: 'Call 024 813 8722', href: 'tel:+233248138722' },
] as const

export default function TrustBar() {
    return (
        <section aria-label="Buyer information" className={`${HOME_CONTAINER} mt-4`}>
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-800 sm:grid-cols-3">
                {ITEMS.map(({ icon: Icon, title, text, href }) => (
                    <li key={title} className="bg-white dark:bg-neutral-900">
                        <Link
                            href={href}
                            className="flex min-h-[44px] items-center gap-3 p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 sm:p-3"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{title}</span>
                                <span className="block text-xs text-neutral-500 dark:text-neutral-400">{text}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
