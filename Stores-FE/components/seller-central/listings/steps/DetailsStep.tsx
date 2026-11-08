'use client'

import useSWR from 'swr'
import { CONDITIONS, fetchBrands, fetchCategories, fetchSubcategories, type ProductCondition } from '@/lib/seller/listings'
import type { FormApi } from '../formApi'
import { Field, SelectInput, TextArea, TextInput } from '../ui'

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const

export function DetailsStep({ form }: { form: FormApi }) {
    const { values, errors, patch } = form
    const category = values.category

    const categories = useSWR('seller:catalog:categories', fetchCategories, SWR_OPTIONS)
    const subcategories = useSWR(category ? ['seller:catalog:subcategories', category] : null, () => fetchSubcategories(category), SWR_OPTIONS)
    const brands = useSWR(category ? ['seller:catalog:brands', category] : null, () => fetchBrands(category), SWR_OPTIONS)

    const catalogFailed = categories.error || subcategories.error || brands.error

    return (
        <div className="grid grid-cols-1 gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
            <Field label="Title" error={errors.name} className="sm:col-span-2">
                {(f) => <TextInput {...f} value={values.name} onChange={(e) => patch({ name: e.target.value })} maxLength={255} autoComplete="off" />}
            </Field>

            <Field label="Description" error={errors.description} hint="What buyers should know: materials, what is in the box, size and fit." className="sm:col-span-2">
                {(f) => <TextArea {...f} value={values.description} onChange={(e) => patch({ description: e.target.value })} rows={5} maxLength={5000} />}
            </Field>

            <Field label="Category" error={errors.category}>
                {(f) => (
                    <SelectInput {...f} value={values.category} disabled={categories.isLoading} onChange={(e) => patch({ category: e.target.value, sub_category: '', brand: '' })}>
                        <option value="">{categories.isLoading ? 'Loading...' : 'Choose a category'}</option>
                        {(categories.data ?? []).map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                )}
            </Field>

            <Field label="Subcategory" error={errors.sub_category}>
                {(f) => (
                    <SelectInput {...f} value={values.sub_category} disabled={!category || subcategories.isLoading} onChange={(e) => patch({ sub_category: e.target.value })}>
                        <option value="">{!category ? 'Choose a category first' : subcategories.isLoading ? 'Loading...' : 'Choose a subcategory'}</option>
                        {(subcategories.data ?? []).map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                )}
            </Field>

            <Field label="Brand" error={errors.brand} hint={category && !brands.isLoading && !brands.error && (brands.data ?? []).length === 0 ? 'No brands are set up for this category yet.' : undefined}>
                {(f) => (
                    <SelectInput {...f} value={values.brand} disabled={!category || brands.isLoading} onChange={(e) => patch({ brand: e.target.value })}>
                        <option value="">{!category ? 'Choose a category first' : brands.isLoading ? 'Loading...' : 'Choose a brand'}</option>
                        {(brands.data ?? []).map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </SelectInput>
                )}
            </Field>

            <Field label="Condition" error={errors.condition}>
                {(f) => (
                    <SelectInput {...f} value={values.condition} onChange={(e) => patch({ condition: e.target.value as ProductCondition })}>
                        {CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </SelectInput>
                )}
            </Field>

            <Field label="Search keywords (optional)" error={errors.keywords} hint="Comma-separated words buyers might search for. Leave blank to use the title." className="sm:col-span-2">
                {(f) => <TextInput {...f} value={values.keywords} onChange={(e) => patch({ keywords: e.target.value })} maxLength={255} autoComplete="off" />}
            </Field>

            {catalogFailed ? (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400 sm:col-span-2">
                    Could not load categories, subcategories or brands. Check your connection and reopen this step.
                </p>
            ) : null}
        </div>
    )
}
