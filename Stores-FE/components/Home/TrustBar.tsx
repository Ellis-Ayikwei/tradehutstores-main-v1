import Link from 'next/link'
import { HOME_CONTAINER } from './HomeSection'

const LINKS = [
    { label: 'Buyer protection', href: '/buyer-protection' },
    { label: 'Returns', href: '/returns' },
] as const

const linkClass =
    'inline-flex min-h-[44px] items-center underline-offset-4 hover:text-neutral-900 hover:underline dark:hover:text-white'

export default function TrustBar() {
    return (
        <nav aria-label="Buyer information" className={`${HOME_CONTAINER} mt-4`}>
            <ul className="flex flex-wrap items-center gap-x-6 border-y border-neutral-200 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                {LINKS.map(({ label, href }) => (
                    <li key={href}>
                        <Link href={href} className={linkClass}>
                            {label}
                        </Link>
                    </li>
                ))}
                <li className="sm:ml-auto">
                    Questions? Call{' '}
                    <a
                        href="tel:+233248138722"
                        className={`${linkClass} font-medium text-neutral-900 dark:text-white`}
                    >
                        024 813 8722
                    </a>
                </li>
            </ul>
        </nav>
    )
}