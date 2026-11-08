'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { fetchAttributes, fetchAttributeValues, formatMoney, LOW_STOCK_THRESHOLD } from '@/lib/seller/listings'
import type { FormApi } from '../formApi'
import { OptionTypesEditor } from '../OptionTypesEditor'
import { VariantMatrix } from '../VariantMatrix'
import { resuggestSkus, syncMatrix, toOptionValue, valueLabels } from '../optionUtils'
import { emptyVariant, MAX_NAMED_VARIANTS, type ImageItem, type OptionType } from '../schema'
import { Banner, btnDanger, btnGhost, btnSecondary, btnSmall, cx, Field, linkBtn, Modal, mutedText, panelCls, TextInput, Toggle, useToast } from '../ui'

interface VariantsStepProps {
    form: FormApi
    images: ImageItem[]
    onImagesChange: (next: ImageItem[]) => void
}

export function VariantsStep({ form, images, onImagesChange }: VariantsStepProps) {
    const { values, errors, patch, setVariant, currency } = form
    const toast = useToast()
    const { variants, hasOptions, optionsMode: mode, optionTypes: types } = values
    const discount = Number(values.discount_percentage) || 0
    const [confirmOff, setConfirmOff] = useState(false)
    const [converting, setConverting] = useState(false)

    const structured = hasOptions && mode === 'attributes'
    const named = hasOptions && mode === 'names'
    const savedNamedRows = named && variants.some((v) => v.serverId)

    const arrayError = errors.variants
    const typeErrors: Record<number, string> = {}
    Object.entries(errors).forEach(([path, message]) => {
        const m = /^optionTypes\.(\d+)$/.exec(path)
        if (m) typeErrors[Number(m[1])] = message
    })

    /* ------------------------------------------------------------- toggle */

    const turnOn = () => {
        const first = variants[0]
        patch({
            hasOptions: true,
            optionsMode: 'attributes',
            optionTypes: [],
            // The simple item's price and SKU become the starting point for the matrix.
            basePrice: first?.price.trim() && !values.basePrice.trim() ? first.price.trim() : values.basePrice,
            baseSku: first?.sku.trim() && !values.baseSku.trim() ? first.sku.trim() : values.baseSku,
            variants: [],
        })
    }

    const turnOff = () => {
        const first = variants.find((r) => r.enabled) ?? variants[0]
        patch({
            hasOptions: false,
            optionTypes: [],
            // A row that carried structured values is cleared so it saves as a plain item.
            variants: [first ? { ...first, name: '', enabled: true, skuAuto: false, ...(first.valueIds ? { valueIds: [] } : {}) } : emptyVariant()],
        })
        setConfirmOff(false)
    }

    const onToggle = (checked: boolean) => {
        if (checked) turnOn()
        else if (variants.filter((v) => v.enabled).length > 1) setConfirmOff(true)
        else turnOff()
    }

    /* --------------------------------------------------- structured options */

    const rebuild = (nextTypes: OptionType[]) => {
        patch({ optionTypes: nextTypes, variants: syncMatrix(nextTypes, variants, { baseSku: values.baseSku, basePrice: values.basePrice }) })
    }

    const onBaseSkuChange = (value: string) => {
        patch({ baseSku: value, variants: resuggestSkus(types, variants, value) })
    }

    const onBasePriceChange = (value: string) => {
        // Rows that have no price yet follow the base price; anything the seller entered is left alone.
        patch({ basePrice: value, variants: variants.map((v) => (v.enabled && !v.price.trim() ? { ...v, price: value.trim() } : v)) })
    }

    const useNamedOptions = () => patch({ optionsMode: 'names', optionTypes: [], variants: [emptyVariant(), emptyVariant()] })

    const useOptionTypes = () => patch({ optionsMode: 'attributes', optionTypes: [], variants: [] })

    /** Best effort: split names like "Red / Large" and match each part to an existing option value. */
    const convertNames = async () => {
        setConverting(true)
        try {
            const [attrs, allValues] = await Promise.all([fetchAttributes(), fetchAttributeValues()])
            const rows = variants
            const parts = rows.map((r) =>
                r.name
                    .split(/\s*[/,|]\s*|\s+-\s+/)
                    .map((p) => p.trim())
                    .filter(Boolean)
            )
            const width = parts[0]?.length ?? 0
            if (width < 1 || width > 3 || parts.some((p) => p.length !== width)) throw new Error('shape')

            const attrById = new Map(attrs.map((a) => [a.id, a]))
            const matched: { attributeId: string; valueId: string }[][] = []
            for (const p of parts) {
                const row: { attributeId: string; valueId: string }[] = []
                for (const part of p) {
                    const hits = allValues.filter((v) => v.label.toLowerCase() === part.toLowerCase())
                    if (new Set(hits.map((h) => h.attributeId)).size !== 1) throw new Error('match')
                    row.push({ attributeId: hits[0].attributeId, valueId: hits[0].id })
                }
                matched.push(row)
            }
            const nextTypes: OptionType[] = []
            for (let j = 0; j < width; j += 1) {
                const attributeId = matched[0][j].attributeId
                const attr = attrById.get(attributeId)
                if (!attr || matched.some((m) => m[j].attributeId !== attributeId) || nextTypes.some((t) => t.attributeId === attributeId)) throw new Error('types')
                const seen = new Set<string>()
                const optionValues = matched
                    .map((m) => allValues.find((v) => v.id === m[j].valueId))
                    .filter((v): v is NonNullable<typeof v> => {
                        if (!v || seen.has(v.id)) return false
                        seen.add(v.id)
                        return true
                    })
                    .map(toOptionValue)
                nextTypes.push({ attributeId, name: attr.name, displayType: attr.displayType, values: optionValues })
            }
            const keys = new Set(matched.map((m) => m.map((x) => x.valueId).join('|')))
            if (keys.size !== rows.length) throw new Error('dupes')

            const converted = rows.map((r, i) => ({ ...r, name: '', enabled: true, skuAuto: false, valueIds: matched[i].map((m) => m.valueId) }))
            const next = syncMatrix(nextTypes, converted, { baseSku: '', basePrice: '' }).map((r) => (r.serverId ? r : { ...r, enabled: false, sku: '', skuAuto: false }))
            patch({ optionsMode: 'attributes', optionTypes: nextTypes, variants: next })
            toast.success('Converted. Check the rows below, then continue.')
        } catch (e) {
            const network = !(e instanceof Error && ['shape', 'match', 'types', 'dupes'].includes(e.message))
            toast.error(network ? 'Could not load option values. Try again.' : 'We could not match every name to an existing option value. Pick option types yourself below or keep the names.')
        } finally {
            setConverting(false)
        }
    }

    /* ------------------------------------------------------------- render */

    const rowFields = (index: number, withName: boolean) => {
        const row = variants[index]
        const price = row?.price?.trim() ?? ''
        const qty = Number(row?.quantity)
        const priceNum = Number(price)
        const showFinal = discount > 0 && Number.isFinite(priceNum) && priceNum > 0
        const qtyTyped = Boolean(row?.quantity?.trim())
        return (
            <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                    {withName ? (
                        <Field label="Option name" error={errors[`variants.${index}.name`]} hint="This is what buyers choose from, e.g. Red / Large" className="col-span-2 sm:col-span-12">
                            {(f) => <TextInput {...f} value={row?.name ?? ''} onChange={(e) => setVariant(index, { name: e.target.value })} maxLength={255} autoComplete="off" placeholder="Red / Large" />}
                        </Field>
                    ) : null}
                    <Field label={currency ? `Price (${currency})` : 'Price'} error={errors[`variants.${index}.price`]} className="col-span-1 sm:col-span-4">
                        {(f) => <TextInput {...f} value={row?.price ?? ''} inputMode="decimal" autoComplete="off" onChange={(e) => setVariant(index, { price: e.target.value })} />}
                    </Field>
                    <Field label="Stock" error={errors[`variants.${index}.quantity`]} className="col-span-1 sm:col-span-3">
                        {(f) => <TextInput {...f} value={row?.quantity ?? ''} inputMode="numeric" autoComplete="off" onChange={(e) => setVariant(index, { quantity: e.target.value })} />}
                    </Field>
                    <Field label="SKU" error={errors[`variants.${index}.sku`]} className="col-span-2 sm:col-span-5">
                        {(f) => <TextInput {...f} value={row?.sku ?? ''} maxLength={100} autoComplete="off" onChange={(e) => setVariant(index, { sku: e.target.value, skuAuto: false })} />}
                    </Field>
                </div>
                {showFinal || (Number.isFinite(qty) && qty <= LOW_STOCK_THRESHOLD && qtyTyped) ? (
                    <p className={cx('mt-1.5 text-xs', mutedText)}>
                        {showFinal ? `Buyers pay ${formatMoney(priceNum - (priceNum * discount) / 100, currency)}. ` : ''}
                        {Number.isFinite(qty) && qty === 0 && qtyTyped ? 'Zero stock: buyers cannot order this item. ' : ''}
                        {Number.isFinite(qty) && qty > 0 && qty <= LOW_STOCK_THRESHOLD ? 'Counts as low stock.' : ''}
                    </p>
                ) : null}
            </>
        )
    }

    const offeredFirst = variants.find((v) => v.enabled)
    const offeredLabel = offeredFirst?.valueIds?.length ? valueLabels(types, offeredFirst.valueIds).join(' / ') : offeredFirst?.name?.trim() || 'the first option'
    const typesError = errors.optionTypes

    return (
        <div className="space-y-3">
            <div className={cx(panelCls, 'flex items-start justify-between gap-3')}>
                <div className="min-w-0 pt-2">
                    <p id="has-options-label" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        This product has options (size, colour...)
                    </p>
                    <p className={cx('mt-0.5 text-xs', mutedText)}>{hasOptions ? 'Buyers will choose one of the options below.' : 'Leave this off if you sell one item. Buyers will not see any options.'}</p>
                </div>
                <Toggle checked={hasOptions} onChange={onToggle} label="This product has options" />
            </div>

            {!hasOptions
                ? variants.map((_, index) => (
                      <div key={index} className={panelCls}>
                          {rowFields(index, false)}
                      </div>
                  ))
                : null}

            {structured ? (
                <>
                    <OptionTypesEditor
                        types={types}
                        onChange={rebuild}
                        onUseNames={variants.some((v) => v.serverId && v.valueIds?.length) ? undefined : useNamedOptions}
                        error={typesError}
                        typeErrors={typeErrors}
                    />
                    {variants.length > 0 ? <VariantMatrix form={form} types={types} images={images} onImagesChange={onImagesChange} onBaseSkuChange={onBaseSkuChange} onBasePriceChange={onBasePriceChange} /> : null}
                </>
            ) : null}

            {named ? (
                <>
                    <Banner tone="info" role="note">
                        <div className="space-y-2">
                            <p>Use option types so buyers can pick colour and size.</p>
                            <div className="flex flex-wrap gap-2">
                                {savedNamedRows ? (
                                    <button type="button" className={cx(btnSecondary, btnSmall)} onClick={() => void convertNames()} disabled={converting}>
                                        {converting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                        Convert to option types
                                    </button>
                                ) : null}
                                <button type="button" className={cx(btnSecondary, btnSmall)} onClick={useOptionTypes}>
                                    {savedNamedRows ? 'Start again with option types' : 'Use option types'}
                                </button>
                            </div>
                        </div>
                    </Banner>

                    {variants.map((_, index) => (
                        <div key={index} className={panelCls}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{`Option ${index + 1}`}</p>
                                {variants.length > 2 ? (
                                    <button
                                        type="button"
                                        className={cx(btnGhost, btnSmall, '-mr-2 text-red-700 hover:text-red-800 dark:text-red-400')}
                                        onClick={() => patch({ variants: variants.filter((_, i) => i !== index) })}
                                        aria-label={`Remove option ${index + 1}`}
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        Remove
                                    </button>
                                ) : null}
                            </div>
                            {rowFields(index, true)}
                        </div>
                    ))}
                    {variants.length < 2 ? <p className={cx('text-sm', mutedText)}>Add at least two options or turn this off.</p> : null}
                    <button type="button" className={cx(btnSecondary, btnSmall)} onClick={() => patch({ variants: [...variants, emptyVariant()] })} disabled={variants.length >= MAX_NAMED_VARIANTS}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add option
                    </button>
                </>
            ) : null}

            {arrayError ? (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                    {arrayError}
                </p>
            ) : null}

            <div className={panelCls}>
                <Field
                    label="Discount (%)"
                    error={errors.discount_percentage}
                    hint={hasOptions ? 'Takes this percentage off every option price. Use 0 for no discount.' : 'Takes this percentage off the price. Use 0 for no discount.'}
                    className="max-w-[12rem]"
                >
                    {(f) => <TextInput {...f} value={values.discount_percentage} inputMode="numeric" autoComplete="off" onChange={(e) => patch({ discount_percentage: e.target.value })} />}
                </Field>
            </div>

            <Modal
                open={confirmOff}
                onClose={() => setConfirmOff(false)}
                title="Turn off options?"
                description={`Only the first option (${offeredLabel}) is kept, as a single item with no option name. The other options are removed when you save.`}
                footer={
                    <>
                        <button type="button" className={btnSecondary} onClick={() => setConfirmOff(false)}>
                            Keep options
                        </button>
                        <button type="button" className={btnDanger} onClick={turnOff}>
                            Turn off
                        </button>
                    </>
                }
            />
        </div>
    )
}

export { linkBtn as _unusedLinkBtn }
