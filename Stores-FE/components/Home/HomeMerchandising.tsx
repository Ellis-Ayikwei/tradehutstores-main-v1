'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Zap } from 'lucide-react'
import { Button } from 'antd'
import axiosInstance from '@/lib/axiosInstance'
import ProductCard from '@/components/Products/ProductCard'

export type HomepageMerchSection = {
    id: number
    title: string
    subtitle: string
    slug: string
    section_type: string
    max_products: number
    position: number
    is_live: boolean
    starts_at: string | null
    ends_at: string | null
    show_countdown: boolean
    background_color: string
    accent_color: string
    products: Record<string, unknown>[]
}

function rowClass(sectionType: string) {
    if (sectionType === 'grid') {
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2'
    }
    return 'flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 [scrollbar-width:thin]'
}

function cardCellClass(sectionType: string) {
    if (sectionType === 'grid') {
        return 'min-w-0'
    }
    return 'flex-shrink-0 w-[calc(50%-0.25rem)] sm:w-[calc(33.333%-0.5rem)] md:w-auto min-w-0'
}

export default function HomeMerchandising() {
    const [sections, setSections] = useState<HomepageMerchSection[]>([])
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await axiosInstance.get<HomepageMerchSection[]>('homepage/sections/')
                if (!cancelled) setSections(Array.isArray(data) ? data : [])
            } catch {
                if (!cancelled) setSections([])
            } finally {
                if (!cancelled) setReady(true)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    if (!ready || sections.length === 0) {
        return null
    }

    return (
        <>
            {sections.map((section, idx) => {
                const bgStyle =
                    section.background_color && section.section_type !== 'flash_sale'
                        ? { backgroundColor: section.background_color }
                        : undefined

                if (section.section_type === 'banner') {
                    return (
                        <section
                            key={section.id}
                            className="py-8 md:py-10 border-b border-neutral-200/80 dark:border-neutral-800"
                            style={
                                section.background_color
                                    ? { backgroundColor: section.background_color }
                                    : undefined
                            }
                        >
                            <div className="container mx-auto px-4 text-center max-w-3xl">
                                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
                                    {section.title}
                                </h2>
                                {section.subtitle ? (
                                    <p className="mt-2 text-neutral-600 dark:text-neutral-300">
                                        {section.subtitle}
                                    </p>
                                ) : null}
                            </div>
                        </section>
                    )
                }

                const isFlash = section.section_type === 'flash_sale'
                const products = section.products || []

                return (
                    <section
                        key={section.id}
                        className={
                            idx % 2 === 0
                                ? 'py-12 bg-white dark:bg-gray-900'
                                : 'py-12 bg-gray-50 dark:bg-gray-950'
                        }
                        style={bgStyle}
                    >
                        <div className="container mx-auto px-4">
                            {isFlash ? (
                                <div className="bg-gray-900 dark:bg-gray-950 px-4 md:px-6 py-4 rounded-lg mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-neutral-800">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="p-2 bg-orange-500/10 rounded">
                                            <Zap className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-2xl font-bold text-white">
                                                {section.title}
                                            </h2>
                                            {section.subtitle ? (
                                                <p className="text-sm text-neutral-400 mt-0.5">
                                                    {section.subtitle}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                    {section.show_countdown && section.ends_at ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded border border-gray-700 w-fit">
                                            <span className="text-xs text-gray-400">Ends:</span>
                                            <span className="text-sm font-mono font-bold text-orange-500">
                                                {new Date(section.ends_at).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                            {section.title}
                                        </h2>
                                        {section.subtitle ? (
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                                {section.subtitle}
                                            </p>
                                        ) : null}
                                    </div>
                                    <Link href="/products" className="shrink-0">
                                        <Button
                                            type="link"
                                            className="text-primary-500 hover:text-primary-600 font-semibold px-0"
                                            icon={<ArrowRight className="h-5 w-5" />}
                                            iconPosition="end"
                                        >
                                            See all
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {products.length === 0 ? (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    No products in this section yet.
                                </p>
                            ) : (
                                <div className={rowClass(section.section_type)}>
                                    {products.map((product, index) => (
                                        <motion.div
                                            key={String((product as { id?: unknown }).id ?? index)}
                                            initial={{ opacity: 0, y: 16 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: Math.min(index * 0.04, 0.4) }}
                                            className={cardCellClass(section.section_type)}
                                        >
                                            <ProductCard
                                                product={product as any}
                                                variant={isFlash ? 'flash-sale' : 'default'}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                )
            })}
        </>
    )
}
