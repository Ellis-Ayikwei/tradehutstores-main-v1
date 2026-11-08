import type { FormErrors, ListingFormValues, VariantFormValues } from './schema'

/** What the wizard hands to each step: current values, the errors to show, and the only ways to change values. */
export interface FormApi {
    values: ListingFormValues
    /** Errors to display (steps the seller already tried to leave, plus server-side field errors). */
    errors: FormErrors
    /** Merges fields into the form. Changing `variants` or `optionTypes` also clears their server errors. */
    patch: (changes: Partial<ListingFormValues>) => void
    setVariant: (index: number, changes: Partial<VariantFormValues>) => void
    currency?: string
}
