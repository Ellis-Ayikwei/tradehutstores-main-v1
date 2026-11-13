import { storefrontHref } from '@/lib/storefront'

const LINKS = [
    { label: 'Help centre', path: '/help' },
    { label: 'Terms', path: '/legal/terms' },
    { label: 'Privacy', path: '/legal/privacy' },
    { label: 'Cookies', path: '/legal/cookies' },
]

/** Lean Seller Central footer: legal and help links on the buyer storefront. */
export default function SellerFooter() {
    return (
        <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-3 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6">
                <p className="text-zinc-600 dark:text-zinc-400">&copy; {new Date().getFullYear()} TradeHut Seller Central</p>
                <nav aria-label="Footer">
                    <ul className="flex flex-wrap gap-x-4">
                        {LINKS.map((link) => (
                            <li key={link.path}>
                                <a
                                    href={storefrontHref(link.path)}
                                    className="inline-flex min-h-[44px] items-center text-zinc-700 hover:text-zinc-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-zinc-300 dark:hover:text-zinc-100 dark:focus-visible:ring-primary-400 sm:min-h-0"
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </footer>
    )
}
