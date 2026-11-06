import { BadgeCheck, ExternalLink, FileText, Store } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SellerPublic } from './types'

function Card({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:p-4">
            <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
            {children}
        </section>
    )
}

function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <span className="text-gray-500">{icon}</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{hint}</p>
        </div>
    )
}

const LINKS: Array<{ key: 'website_url' | 'facebook_url' | 'instagram_url' | 'twitter_url'; label: string }> = [
    { key: 'website_url', label: 'Website' },
    { key: 'facebook_url', label: 'Facebook' },
    { key: 'instagram_url', label: 'Instagram' },
    { key: 'twitter_url', label: 'X / Twitter' },
]

export function StoreAbout({ seller, productCount }: { seller: SellerPublic | null; productCount: number }) {
    if (!seller) {
        return (
            <Empty
                icon={<Store className="h-8 w-8" aria-hidden="true" />}
                title="This store hasn't shared its details yet"
                hint="Browse the products tab to see what this seller offers."
            />
        )
    }

    const links = LINKS.filter((l) => seller[l.key])

    return (
        <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
                <Card title={`About ${seller.business_name}`}>
                    {seller.business_description ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                            {seller.business_description}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">This seller hasn&apos;t added a description yet.</p>
                    )}
                </Card>
            </div>

            <div className="space-y-3">
                <Card title="Store details">
                    <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                        <div className="flex items-center justify-between gap-3 py-1.5">
                            <dt className="text-gray-600 dark:text-gray-400">Verification</dt>
                            <dd className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                                {seller.is_verified ? (
                                    <>
                                        <BadgeCheck className="h-4 w-4 text-blue-700" aria-hidden="true" />
                                        Verified seller
                                    </>
                                ) : (
                                    'Not verified yet'
                                )}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-1.5">
                            <dt className="text-gray-600 dark:text-gray-400">Products</dt>
                            <dd className="font-semibold text-gray-900 dark:text-white">{productCount.toLocaleString()}</dd>
                        </div>
                        {seller.total_orders && seller.total_orders > 0 ? (
                            <div className="flex items-center justify-between gap-3 py-1.5">
                                <dt className="text-gray-600 dark:text-gray-400">Orders</dt>
                                <dd className="font-semibold text-gray-900 dark:text-white">{seller.total_orders.toLocaleString()}</dd>
                            </div>
                        ) : null}
                        {seller.is_accepting_orders !== null ? (
                            <div className="flex items-center justify-between gap-3 py-1.5">
                                <dt className="text-gray-600 dark:text-gray-400">Accepting orders</dt>
                                <dd className="font-semibold text-gray-900 dark:text-white">{seller.is_accepting_orders ? 'Yes' : 'Not right now'}</dd>
                            </div>
                        ) : null}
                    </dl>
                </Card>

                {links.length > 0 ? (
                    <Card title="Find this seller online">
                        <ul className="flex flex-wrap gap-2">
                            {links.map((l) => (
                                <li key={l.key}>
                                    <a
                                        href={seller[l.key] ?? '#'}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:border-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                                    >
                                        {l.label}
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ) : null}
            </div>
        </div>
    )
}

export function StorePolicies({ seller }: { seller: SellerPublic | null }) {
    if (!seller || (!seller.shipping_policy && !seller.return_policy)) {
        return (
            <Empty
                icon={<FileText className="h-8 w-8" aria-hidden="true" />}
                title="No store policies published"
                hint="This seller hasn't added shipping or return policies."
            />
        )
    }
    return (
        <div className="grid gap-3 md:grid-cols-2">
            {seller.shipping_policy ? (
                <Card title="Shipping policy">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200">{seller.shipping_policy}</p>
                </Card>
            ) : null}
            {seller.return_policy ? (
                <Card title="Return policy">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200">{seller.return_policy}</p>
                </Card>
            ) : null}
        </div>
    )
}
