'use client'

import { X } from 'lucide-react'
import { useState } from 'react'

export default function PromoBar() {
    const [isVisible, setIsVisible] = useState(true)

    if (!isVisible) return null

    return (
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-1 overflow-hidden">
            {/* Animated background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" 
                 style={{ transform: 'translateX(-100%)' }} />
            
            <div className="container mx-auto px-4 relative z-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center justify-center gap-3 text-sm">
                        <span className="text-xs sm:text-sm font-medium tracking-wide">
                            <span className="inline-block animate-bounce mr-2">🎉</span>
                            <span className="font-bold uppercase tracking-wider">Limited Time:</span> Save up to{' '}
                            <span className="inline-block font-black text-xl mx-1 text-yellow-300 drop-shadow-lg">50% OFF</span>
                            on premium collections
                            <span className="ml-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold hover:bg-white/30 transition-all cursor-pointer inline-block border border-white/30">
                                Shop Now →
                            </span>
                        </span>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-all hover:rotate-90 duration-300 backdrop-blur-sm"
                        aria-label="Close banner"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    )
}