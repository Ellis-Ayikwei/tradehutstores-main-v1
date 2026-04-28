'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import MainLayout from '@/components/Layouts/MainLayout'
import axiosInstance from '@/lib/axiosInstance'

type Subcategory = { name: string; count: number }
type Category = { name: string; icon: string; subcategories: Subcategory[] }

const categoryIcons = ['📱', '👔', '🏠', '⚽', '💄', '🎮', '📚', '🚗', '🛠️', '📦']

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const [categoriesRes, subCategoriesRes] = await Promise.all([
                    axiosInstance.get('/catalog/categories/'),
                    axiosInstance.get('/catalog/subcategories/'),
                ])

                const categoriesData = categoriesRes.data ?? []
                const subCategoriesData = subCategoriesRes.data ?? []

                const byCategory: Record<string, Subcategory[]> = {}
                categoriesData.forEach((cat: any) => {
                    byCategory[cat.name] = []
                })

                subCategoriesData.forEach((sub: any) => {
                    const parent = categoriesData.find((cat: any) => cat.id === sub.category)
                    if (!parent?.name) return
                    byCategory[parent.name].push({
                        name: sub.sub_category_name,
                        count: 0,
                    })
                })

                const normalized = categoriesData.map((cat: any, index: number) => ({
                    name: cat.name,
                    icon: categoryIcons[index % categoryIcons.length],
                    subcategories: (byCategory[cat.name] ?? []).sort((a, b) =>
                        a.name.localeCompare(b.name)
                    ),
                }))

                setCategories(normalized)
            } finally {
                setLoading(false)
            }
        }

        fetchCategories()
    }, [])

    const totalSubcategories = useMemo(
        () => categories.reduce((acc, category) => acc + category.subcategories.length, 0),
        [categories]
    )

    return (
        <MainLayout>
            <div className="min-h-screen bg-surface text-on-surface">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-10">
                    <div className="mb-8">
                        <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                            All Categories
                        </h1>
                        <p className="text-on-surface-variant text-sm">
                            {loading
                                ? 'Loading categories...'
                                : `${categories.length.toLocaleString()} categories and ${totalSubcategories.toLocaleString()} subcategories`}
                        </p>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl border border-outline-variant/20 p-5 animate-pulse bg-surface-container-lowest"
                                >
                                    <div className="h-5 w-40 bg-surface-container rounded mb-3" />
                                    <div className="space-y-2">
                                        <div className="h-3 w-full bg-surface-container rounded" />
                                        <div className="h-3 w-4/5 bg-surface-container rounded" />
                                        <div className="h-3 w-3/5 bg-surface-container rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {categories.map(category => (
                                <div
                                    key={category.name}
                                    className="rounded-2xl border border-outline-variant/20 p-5 bg-surface-container-lowest shadow-card"
                                >
                                    <Link
                                        href={`/products?category=${encodeURIComponent(category.name)}`}
                                        className="flex items-center gap-2 mb-3"
                                    >
                                        <span className="text-xl leading-none">{category.icon}</span>
                                        <span className="font-syne font-bold text-lg hover:text-primary transition-colors">
                                            {category.name}
                                        </span>
                                    </Link>

                                    <ul className="space-y-1.5">
                                        {category.subcategories.map(sub => (
                                            <li key={`${category.name}-${sub.name}`}>
                                                <Link
                                                    href={`/products?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                                                    className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                                                >
                                                    {sub.name}
                                                </Link>
                                            </li>
                                        ))}
                                        {category.subcategories.length === 0 && (
                                            <li className="text-sm text-outline">No subcategories yet</li>
                                        )}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
