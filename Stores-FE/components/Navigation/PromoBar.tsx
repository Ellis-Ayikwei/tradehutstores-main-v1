'use client'

import { X, Tag } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import AdTopBar from '@/components/Ads/AdTopBar'

/**
 * Promo strip above the main nav.
 *
 * Behaviour:
 *   1. Fetches the `homepage-top-bar` ad placement and renders the served creative.
 *   2. If no ad is live, falls back to the legacy hardcoded "50% OFF" message.
 *   3. Either way, dismissible per-session.
 */
export default function PromoBar() {
    return <AdTopBar slug="homepage-top-bar" fallback={<LegacyPromoBar />} />
}

function LegacyPromoBar() {
    const [isVisible, setIsVisible] = useState(true)

    if (!isVisible) return null

    return (
        <>
            <style>{`
                @keyframes shimmer {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(250%); }
                }
            `}</style>

            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
                {/* Shimmer sweep */}
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                    style={{ animation: 'shimmer 3s ease-in-out infinite' }}
                />

                <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 relative z-10">
                    <div className="flex items-center justify-between gap-2 py-1.5 sm:py-2">

                        {/* ── Content ── */}
                        <div className="flex-1 flex items-center justify-center min-w-0">

                            {/* Mobile: compact single line */}
                            <div className="flex sm:hidden items-center gap-2 text-xs font-medium">
                                <span className="shrink-0">🎉</span>
                                <span>
                                    <span className="font-black text-yellow-300">50% OFF</span>
                                    {' '}premium collections
                                </span>
                                <Link
                                    href="/deals"
                                    className="shrink-0 px-2.5 py-0.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full text-[11px] font-bold transition-all whitespace-nowrap"
                                >
                                    Shop →
                                </Link>
                            </div>

                            {/* Tablet+ : full message */}
                            <div className="hidden sm:flex items-center gap-2 text-sm font-medium flex-wrap justify-center">
                                <span className="animate-bounce shrink-0">🎉</span>
                                <span className="font-bold uppercase tracking-wider text-xs">Limited Time:</span>
                                <span>Save up to</span>
                                <span className="font-black text-xl text-yellow-300 drop-shadow-lg leading-none">50% OFF</span>
                                <span className="hidden md:inline">on premium collections</span>
                                <Link
                                    href="/deals"
                                    className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm rounded-full text-xs font-bold transition-all whitespace-nowrap"
                                >
                                    <Tag className="h-3 w-3" />
                                    Shop Now
                                </Link>
                            </div>
                        </div>

                        {/* ── Close ── */}
                        <button
                            onClick={() => setIsVisible(false)}
                            className="shrink-0 p-1 sm:p-1.5 hover:bg-white/20 rounded-full transition-all hover:rotate-90 duration-300"
                            aria-label="Close banner"
                        >
                            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
