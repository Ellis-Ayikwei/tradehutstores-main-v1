'use client'

import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { ImagePlus } from 'lucide-react'
import { formatMoney, LOW_STOCK_THRESHOLD } from '@/lib/seller/listings'
import type { FormApi } from './formApi'
import { MAX_GROUP_IMAGES, MAX_MATRIX, imagesForGroup, pictureTypeIndex, valueLabels } from './optionUtils'
import { ACCEPTED_IMAGE_ATTR, ACCEPTED_IMAGE_MIME, MAX_IMAGE_BYTES, MAX_IMAGES, type ImageItem, type OptionType } from './schema'
import { btnSecondary, cx, Field, headingCls, mutedText, panelCls, TextInput, Toggle, useToast } from './ui'

interface VariantMatrixProps {
    form: FormApi
    types: OptionType[]
    images: ImageItem[]
    onImagesChange: (next: ImageItem[]) => void
    onBaseSkuChange: (value: string) => void
    onBasePriceChange: (value: string) => void
}

/** Step C: one row per combination. A card on small screens, a table-like grid from md. */
export function VariantMatrix({ form, types, images, onImagesChange, onBaseSkuChange, onBasePriceChange }: VariantMatrixProps) {
    const { values, errors, patch, setVariant, currency } = form
    const toast = useToast()
    const variants = values.variants
    const discount = Number(values.discount_percentage) || 0
    const [bulkPrice, setBulkPrice] = useState('')
    const [bulkStock, setBulkStock] = useState('')
    const picIdx = pictureTypeIndex(types)

    const enabledCount = variants.filter((v) => v.enabled).length
    const gridStyle = { '--cols': `3.5rem repeat(${types.length}, minmax(0, 1fr)) 7rem 5.5rem minmax(0, 1.4fr)` } as CSSProperties

    const applyAll = (field: 'price' | 'quantity', raw: string) => {
        const value = raw.trim()
        const valid = field === 'price' ? /^\d{1,8}(\.\d{1,2})?$/.test(value) : /^\d{1,7}$/.test(value)
        if (!valid) {
            toast.error(field === 'price' ? 'Enter a price such as 49.90' : 'Enter a whole number for stock')
            return
        }
        patch({ variants: variants.map((v) => (v.enabled ? { ...v, [field]: value } : v)) })
    }

    const addPicture = (groupId: string, file: File | undefined) => {
        if (!file) return
        if (!ACCEPTED_IMAGE_MIME.includes(file.type)) return void toast.error(`${file.name} is not a JPG, PNG or WebP image`)
        if (file.size > MAX_IMAGE_BYTES) return void toast.error(`${file.name} is larger than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB`)
        if (imagesForGroup(images, groupId).length >= MAX_GROUP_IMAGES) return void toast.error(`Up to ${MAX_GROUP_IMAGES} pictures per ${types[picIdx].name.toLowerCase()}`)
        if (images.length >= MAX_IMAGES) return void toast.error(`Up to ${MAX_IMAGES} images in total`)
        onImagesChange([...images, { key: `new-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file), optionValueId: groupId }])
    }

    return (
        <div className="space-y-3">
            <section className={panelCls}>
                <h3 className={headingCls}>3. Price, stock and SKU</h3>
                <p className={cx('mt-0.5 text-xs', mutedText)}>One row per combination, up to {MAX_MATRIX}. Switch off the ones you do not sell.</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label={currency ? `Base price (${currency})` : 'Base price'} error={errors.basePrice}>
                        {(f) => <TextInput {...f} value={values.basePrice} inputMode="decimal" autoComplete="off" onChange={(e) => onBasePriceChange(e.target.value)} />}
                    </Field>
                    <Field label="SKU prefix" error={errors.baseSku}>
                        {(f) => <TextInput {...f} value={values.baseSku} maxLength={80} autoComplete="off" placeholder="TEE" onChange={(e) => onBaseSkuChange(e.target.value)} />}
                    </Field>
                    <Field label="Set price for all">
                        {(f) => (
                            <div className="flex gap-1.5">
                                <TextInput {...f} value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} inputMode="decimal" autoComplete="off" />
                                <button type="button" className={btnSecondary} onClick={() => applyAll('price', bulkPrice)}>
                                    Apply
                                </button>
                            </div>
                        )}
                    </Field>
                    <Field label="Set stock for all">
                        {(f) => (
                            <div className="flex gap-1.5">
                                <TextInput {...f} value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} inputMode="numeric" autoComplete="off" />
                                <button type="button" className={btnSecondary} onClick={() => applyAll('quantity', bulkStock)}>
                                    Apply
                                </button>
                            </div>
                        )}
                    </Field>
                </div>
            </section>

            <p className={cx('text-xs', mutedText)} aria-live="polite">
                {enabledCount} of {variants.length} combinations offered.
            </p>

            <div className="hidden gap-2 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 md:grid md:[grid-template-columns:var(--cols)]" style={gridStyle} aria-hidden="true">
                <span>Offer</span>
                {types.map((t) => (
                    <span key={t.attributeId}>{t.name}</span>
                ))}
                <span>Price</span>
                <span>Stock</span>
                <span>SKU</span>
            </div>

            <ul className="space-y-2">
                {variants.map((row, index) => {
                    const labels = valueLabels(types, row.valueIds ?? [])
                    const off = !row.enabled
                    const priceNum = Number(row.price)
                    const qty = Number(row.quantity)
                    const showFinal = !off && discount > 0 && Number.isFinite(priceNum) && priceNum > 0
                    const groupId = picIdx >= 0 ? row.valueIds?.[picIdx] : undefined
                    const thumb = groupId ? imagesForGroup(images, groupId)[0] : undefined
                    const key = row.valueIds?.join('|') || row.serverId || String(index)
                    return (
                        <li key={key}>
                            <div
                                className={cx(
                                    'grid grid-cols-2 gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 md:items-start md:[grid-template-columns:var(--cols)]',
                                    off ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'
                                )}
                                style={gridStyle}
                            >
                                <div className="col-span-2 flex items-center justify-between md:col-span-1 md:block">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 md:sr-only">{`Offer ${labels.join(' / ')}`}</span>
                                    <Toggle checked={row.enabled} onChange={(next) => setVariant(index, { enabled: next })} label={`Offer this option: ${labels.join(' / ')}`} />
                                </div>
                                {types.map((t, ti) => (
                                    <div key={t.attributeId} className="min-w-0 md:pt-2.5">
                                        <p className={cx('text-xs md:hidden', mutedText)}>{t.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            {ti === picIdx && groupId ? (
                                                <label
                                                    className={cx(
                                                        'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-300 bg-zinc-100 focus-within:ring-2 focus-within:ring-primary-600 dark:border-zinc-700 dark:bg-zinc-800 sm:h-9 sm:w-9',
                                                        off ? 'cursor-not-allowed' : 'cursor-pointer'
                                                    )}
                                                    title={thumb ? 'Add another picture' : `Add a picture for ${labels[ti]}`}
                                                >
                                                    {thumb ? (
                                                        <Image src={thumb.url} alt={`${labels[ti]} picture`} fill sizes="44px" className="object-contain" />
                                                    ) : (
                                                        <ImagePlus className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept={ACCEPTED_IMAGE_ATTR}
                                                        className="sr-only"
                                                        disabled={off}
                                                        aria-label={`Add a picture for ${labels[ti]}`}
                                                        onChange={(e) => {
                                                            addPicture(groupId, e.target.files?.[0])
                                                            e.target.value = ''
                                                        }}
                                                    />
                                                </label>
                                            ) : null}
                                            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{labels[ti]}</span>
                                        </div>
                                    </div>
                                ))}
                                <Field label={currency ? `Price (${currency})` : 'Price'} labelClassName="md:sr-only" error={off ? undefined : errors[`variants.${index}.price`]}>
                                    {(f) => <TextInput {...f} value={row.price} inputMode="decimal" autoComplete="off" disabled={off} onChange={(e) => setVariant(index, { price: e.target.value })} />}
                                </Field>
                                <Field label="Stock" labelClassName="md:sr-only" error={off ? undefined : errors[`variants.${index}.quantity`]}>
                                    {(f) => <TextInput {...f} value={row.quantity} inputMode="numeric" autoComplete="off" disabled={off} onChange={(e) => setVariant(index, { quantity: e.target.value })} />}
                                </Field>
                                <Field label="SKU" labelClassName="md:sr-only" className="col-span-2 md:col-span-1" error={off ? undefined : errors[`variants.${index}.sku`]}>
                                    {(f) => <TextInput {...f} value={row.sku} maxLength={100} autoComplete="off" disabled={off} onChange={(e) => setVariant(index, { sku: e.target.value, skuAuto: false })} />}
                                </Field>
                                {showFinal || (!off && Number.isFinite(qty) && qty <= LOW_STOCK_THRESHOLD && row.quantity.trim()) ? (
                                    <p className={cx('col-span-2 text-xs md:col-span-full', mutedText)}>
                                        {showFinal ? `Buyers pay ${formatMoney(priceNum - (priceNum * discount) / 100, currency)}. ` : ''}
                                        {qty === 0 && row.quantity.trim() ? 'Zero stock: buyers cannot order this item. ' : ''}
                                        {qty > 0 && qty <= LOW_STOCK_THRESHOLD ? 'Counts as low stock.' : ''}
                                    </p>
                                ) : null}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
