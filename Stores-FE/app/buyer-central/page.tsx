'use client'

import Link from 'next/link'
import {
    ShieldCheck,
    PackageSearch,
    MessageSquareText,
    FileText,
    ArrowRight,
    BadgeCheck,
    Truck,
    Wallet,
} from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'

const quickActions = [
    {
        title: 'Browse Verified Suppliers',
        description: 'Find trusted sellers with verified profiles and transaction history.',
        href: '/products',
        icon: BadgeCheck,
    },
    {
        title: 'Track Current Orders',
        description: 'Monitor order timelines, shipment status, and delivery milestones.',
        href: '/account/orders',
        icon: Truck,
    },
    {
        title: 'Request Quotes (RFQ)',
        description: 'Submit technical requirements and receive competitive supplier bids.',
        href: '/rfq',
        icon: FileText,
    },
    {
        title: 'Manage Buyer Protection',
        description: 'Review payment protections, disputes, and coverage terms.',
        href: '/buyer-protection',
        icon: ShieldCheck,
    },
]

const trustPillars = [
    {
        title: 'Verified Sellers',
        description: 'Identity checks and commerce credential validation.',
        icon: BadgeCheck,
    },
    {
        title: 'Secure Payments',
        description: 'Protected checkout and escrow-style release workflows.',
        icon: Wallet,
    },
    {
        title: 'Reliable Logistics',
        description: 'Shipment tracking with milestone-based transparency.',
        icon: PackageSearch,
    },
]

export default function BuyerCentralPage() {
    return (
        <MainLayout>
            <div className="min-h-screen bg-surface text-on-surface">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-10 md:py-14">
                    <section className="rounded-3xl border border-outline-variant/20 bg-gradient-to-r from-surface-container-lowest via-surface-container-low to-surface-container p-6 md:p-10 mb-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary mb-3">
                            Buyer Operations Hub
                        </p>
                        <h1 className="font-syne text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
                            Buyer Central
                        </h1>
                        <p className="text-sm md:text-base text-on-surface-variant max-w-3xl leading-relaxed">
                            Operate procurement with confidence: discover trusted suppliers, compare offers,
                            track orders, and manage post-purchase support from one command center.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary-container transition-colors"
                            >
                                Start Sourcing <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/help"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
                            >
                                Get Buyer Help
                            </Link>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="font-syne text-xl md:text-2xl font-bold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {quickActions.map(action => {
                                const Icon = action.icon
                                return (
                                    <Link
                                        key={action.title}
                                        href={action.href}
                                        className="group rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 hover:border-primary/30 hover:shadow-card transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center mb-3">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <h3 className="font-bold text-sm md:text-base mb-1 group-hover:text-primary transition-colors">
                                            {action.title}
                                        </h3>
                                        <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
                                            {action.description}
                                        </p>
                                    </Link>
                                )
                            })}
                        </div>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
                        {trustPillars.map(item => {
                            const Icon = item.icon
                            return (
                                <div
                                    key={item.title}
                                    className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <p className="font-bold">{item.title}</p>
                                    </div>
                                    <p className="text-sm text-on-surface-variant">{item.description}</p>
                                </div>
                            )
                        })}
                    </section>

                    <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-lg mb-1">Need support with a purchase?</h3>
                            <p className="text-sm text-on-surface-variant">
                                Our buyer team can help with supplier validation, order issues, and dispute resolution.
                            </p>
                        </div>
                        <Link
                            href="/help"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:text-primary transition-colors"
                        >
                            <MessageSquareText className="h-4 w-4" />
                            Contact Buyer Support
                        </Link>
                    </section>
                </div>
            </div>
        </MainLayout>
    )
}
