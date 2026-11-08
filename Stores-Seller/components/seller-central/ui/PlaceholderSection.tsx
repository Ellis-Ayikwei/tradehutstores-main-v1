'use client'

import { btnPrimary, EmptyPanel, PageHeader } from '@/components/seller-central/ui'

/**
 * Seller Central section whose backend is not live yet: page header plus an honest empty state.
 * No sample rows or fake figures (AGENTS.md section 1b). `disabledAction` renders an inert button
 * so the future entry point is visible; it does nothing until the feature ships.
 */
export default function PlaceholderSection({
    title,
    description,
    emptyTitle,
    emptyDescription,
    disabledAction,
}: {
    title: string
    description: string
    emptyTitle: string
    emptyDescription: string
    disabledAction?: string
}) {
    return (
        <div className="space-y-3">
            <PageHeader title={title} description={description} />
            <EmptyPanel
                title={emptyTitle}
                description={emptyDescription}
                action={
                    disabledAction ? (
                        <button type="button" disabled className={btnPrimary}>
                            {disabledAction}
                        </button>
                    ) : undefined
                }
            />
        </div>
    )
}
