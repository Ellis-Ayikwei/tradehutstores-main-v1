'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { fetchBrands, fetchCategories, fetchSubcategories, formatMoney } from '@/lib/seller/listings'
import type { FormApi } from '../formApi'
import { groupsWithoutPictures, summarizeOptions, valueLabels } from '../optionUtils'
import type { ImageItem } from '../schema'
import { Banner, headingCls, mutedText, panelCls } from '../ui'

interface ReviewStepProps {
    form: FormApi
    images: ImageItem[]
    canPublish: boolean
}

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
            <dt className={`shrink-0 ${mutedText}`}>{label}</dt>
            <dd className="min-w-0 break-words text-right text-zinc-900 dark:text-zinc-100">{children}</dd>
        </div>
    )
}

export function ReviewStep({ form, images, canPublish }: ReviewStepProps) {
    const v = form.values
    const currency = form.currency

    const categories = useSWR('seller:catalog:categories', fetchCategories, SWR_OPTIONS)
    const subcategories = useSWR(v.category ? ['seller:catalog:subcategories', v.category] : null, () => fetchSubcategories(v.category), SWR_OPTIONS)
    const brands = useSWR(v.category ? ['seller:catalog:brands', v.category] : null, () => fetchBrands(v.category), SWR_OPTIONS)

    const label = (opts: { id: string; label: string }[] | undefined, id: string) => opts?.find((o) => o.id === id)?.label ?? '-'
    const discount = Number(v.discount_percentage) || 0
    const structured = v.hasOptions && v.optionsMode === 'attributes'
    const rows = v.variants.filter((x) => x.enabled)
    const totalStock = rows.reduce((sum, x) => sum + (Number(x.quantity) || 0), 0)
    const prices = rows.map((x) => Number(x.price)).filter((n) => Number.isFinite(n))
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const missingPictures = structured ? groupsWithoutPictures(v.optionTypes, v.variants, images) : []
    const rowLabel = (x: (typeof rows)[number]) => (structured ? valueLabels(v.optionTypes, x.valueIds ?? []).join(' / ') : v.hasOptions ? x.name.trim() : 'Single item')

    const blockers: string[] = []
    if (images.length === 0) blockers.push('Add at least one image to publish.')
    if (totalStock === 0) blockers.push('Every variant has zero stock, so buyers could not order it.')
    const hints: string[] = []
    if (missingPictures.length > 0) {
        const typeName = v.optionTypes.find((t) => t.values.some((x) => x.id === missingPictures[0].id))?.name.toLowerCase() ?? 'colour'
        hints.push(`No picture yet for ${missingPictures.map((m) => m.label).join(', ')}. We recommend one for each ${typeName}.`)
    }

    return (
        <div className="space-y-3">
            {blockers.length > 0 ? (
                <Banner tone="warning">
                    <ul className="space-y-0.5">
                        {blockers.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </Banner>
            ) : (
                <Banner tone="success">{canPublish ? 'Ready to publish.' : 'Everything is filled in.'}</Banner>
            )}

            {hints.length > 0 ? (
                <Banner tone="info" role="note">
                    <ul className="space-y-0.5">
                        {hints.map((h) => (
                            <li key={h}>{h}</li>
                        ))}
                    </ul>
                </Banner>
            ) : null}

            <section className={panelCls}>
                <h3 className={`mb-1 ${headingCls}`}>Details</h3>
                <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <Row label="Title">{v.name}</Row>
                    <Row label="Category">{label(categories.data, v.category)}</Row>
                    <Row label="Subcategory">{label(subcategories.data, v.sub_category)}</Row>
                    <Row label="Brand">{label(brands.data, v.brand)}</Row>
                    <Row label="Condition">{v.condition}</Row>
                </dl>
            </section>

            <section className={panelCls}>
                <h3 className={`mb-1 ${headingCls}`}>Price and stock</h3>
                <p className={`text-xs ${mutedText}`}>
                    {structured
                        ? `Options: ${summarizeOptions(v.optionTypes, v.variants)} · ${rows.length} variant${rows.length === 1 ? '' : 's'}`
                        : `Options: ${v.hasOptions ? rows.map((x) => x.name.trim()).filter(Boolean).join(', ') : 'none'}`}
                </p>
                {rows.length > 1 ? (
                    <p className={`mt-0.5 text-xs ${mutedText}`}>
                        {minPrice === maxPrice ? formatMoney(minPrice, currency) : `${formatMoney(minPrice, currency)} to ${formatMoney(maxPrice, currency)}`} · {totalStock} in stock in total
                    </p>
                ) : null}
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rows.map((x, i) => (
                        <li key={`${x.sku}-${i}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                            <div className="min-w-0">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{rowLabel(x)}</p>
                                <p className={`truncate font-mono text-xs ${mutedText}`}>SKU {x.sku}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(x.price, currency)}</p>
                                <p className={`text-xs ${mutedText}`}>{Number(x.quantity) || 0} in stock</p>
                            </div>
                        </li>
                    ))}
                </ul>
                {discount > 0 ? <p className={`mt-1 text-xs ${mutedText}`}>{discount}% discount applies to every variant.</p> : null}
            </section>

            <section className={panelCls}>
                <h3 className={`mb-1.5 ${headingCls}`}>Images</h3>
                {images.length === 0 ? (
                    <p className={`text-sm ${mutedText}`}>No images added.</p>
                ) : (
                    <ul className="flex flex-wrap gap-1.5">
                        {images.map((img, i) => (
                            <li key={img.key} className="relative h-14 w-14 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                                <Image src={img.url} alt={i === 0 ? 'Main product image' : `Product image ${i + 1}`} fill sizes="56px" className="object-contain p-0.5" />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className={panelCls}>
                <h3 className={`mb-1 ${headingCls}`}>Shipping</h3>
                <p className="text-sm text-zinc-900 dark:text-zinc-100">{v.free_shipping ? 'Free shipping' : 'Standard delivery fees apply'}</p>
            </section>
        </div>
    )
}
