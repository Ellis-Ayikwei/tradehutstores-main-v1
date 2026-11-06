import type { ReactNode } from 'react'
import { CardMetaProvider } from './CardMetaContext'
import { cx } from './cx'

export interface ProductGridProps {
    children: ReactNode
    /**
     * default:     2 / 3 / 4 / 5 / 6 columns (full-width pages)
     * withSidebar: 2 / 3 / 4 / 5 columns (beside a filter rail on lg+)
     * dense:       2 / 3 / 5 / 6 / 7 columns (deal walls)
     * listing:     2 / 3 / 4 / 5 columns with tight gaps (beside a filter rail; all-products page)
     */
    layout?: 'default' | 'withSidebar' | 'dense' | 'listing'
    /**
     * Pass `false` when none of the products in this grid has a rating or a meta line (see `productHasMeta`):
     * cards then drop the reserved empty 16px row. Leave undefined to keep every card the same height.
     */
    hasMeta?: boolean
    className?: string
}

const LAYOUTS = {
    default: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
    withSidebar: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    dense: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
    listing: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
} as const

const GAPS = {
    default: 'gap-2 sm:gap-3 lg:gap-4',
    withSidebar: 'gap-2 sm:gap-3 lg:gap-4',
    dense: 'gap-2 sm:gap-3 lg:gap-4',
    listing: 'gap-2 sm:gap-3',
} as const

export default function ProductGrid({ children, layout = 'default', hasMeta, className }: ProductGridProps) {
    return (
        <CardMetaProvider reserve={hasMeta !== false}>
            <div className={cx('grid items-stretch', GAPS[layout], LAYOUTS[layout], className)}>{children}</div>
        </CardMetaProvider>
    )
}
