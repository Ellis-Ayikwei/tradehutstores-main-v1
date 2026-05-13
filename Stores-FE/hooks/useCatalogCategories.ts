'use client'

import { useEffect, useState } from 'react'
import axiosInstance from '@/lib/axiosInstance'

export type CatalogSubcategory = { name: string; count: number }

export type CatalogCategoryRow = {
    id: string
    name: string
    subcategories: CatalogSubcategory[]
    /** Sum of active counts on subcategories (0 when none). */
    totalCount: number
}

function parseSubcategory(raw: Record<string, unknown>): CatalogSubcategory {
    const nameRaw = raw.sub_category_name
    const name = typeof nameRaw === 'string' ? nameRaw : ''
    const countRaw = raw.active_product_count
    const count =
        typeof countRaw === 'number' ? countRaw : Number.parseInt(String(countRaw), 10) || 0
    return { name, count }
}

function parseCategory(raw: Record<string, unknown>): CatalogCategoryRow | null {
    const idRaw = raw.id
    const id =
        typeof idRaw === 'string'
            ? idRaw
            : idRaw != null && String(idRaw).length > 0
              ? String(idRaw)
              : ''
    if (!id) return null

    const nameRaw = raw.name
    const name = typeof nameRaw === 'string' ? nameRaw : ''
    if (!name) return null

    const subsRaw = raw.sub_categories
    const subList: unknown[] = Array.isArray(subsRaw) ? subsRaw : []
    const subcategories = subList
        .map((item) => parseSubcategory(item as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name))

    const totalCount = subcategories.reduce((acc, s) => acc + s.count, 0)

    return { id, name, subcategories, totalCount }
}

/**
 * Loads categories with nested subcategories and active product counts.
 * Uses `GET /catalog/categories/?include=subcategories` (one round-trip).
 */
export function useCatalogCategories(): {
    categories: CatalogCategoryRow[]
    loading: boolean
    error: boolean
} {
    const [categories, setCategories] = useState<CatalogCategoryRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const res = await axiosInstance.get('/catalog/categories/', {
                    params: { include: 'subcategories' },
                })
                if (cancelled) return

                const list = Array.isArray(res.data) ? res.data : []
                const rows: CatalogCategoryRow[] = []
                for (const item of list) {
                    const row = parseCategory(item as Record<string, unknown>)
                    if (row) rows.push(row)
                }

                setCategories(rows)
                setError(false)
            } catch {
                if (!cancelled) {
                    setCategories([])
                    setError(true)
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [])

    return { categories, loading, error }
}
