'use client'

import useSWR from 'swr'
import fetcher from '@/lib/fetcher'

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

/** Admin-managed homepage sections (`GET homepage/sections/`). SWR dedupes across components. */
export function useHomeSections() {
    const { data, error, isLoading, mutate } = useSWR<HomepageMerchSection[]>(
        'homepage/sections/',
        (url: string) => fetcher(url),
        { revalidateOnFocus: false }
    )
    return {
        sections: Array.isArray(data) ? data : [],
        loading: isLoading,
        error: Boolean(error),
        retry: () => {
            void mutate()
        },
    }
}
