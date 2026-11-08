import * as Yup from 'yup'
import { MAX_SELLING_CATEGORIES, normalizeOther, validateOther, CATEGORY_REQUIRED_MESSAGE } from '@/components/seller-onboarding/CategoryPicker'
import type { SellerProfile, SellerProfileFields } from '@/lib/seller/types'

/** Ghana mobile: 0XXXXXXXXX, 233XXXXXXXXX or +233XXXXXXXXX (spaces and dashes allowed). */
const GHANA_MOBILE = /^(?:\+?233|0)\d{9}$/

/** Verified sellers cannot change these (API rejects with 400 `identity_locked`). */
export const IDENTITY_LOCKED_FIELDS = ['business_name', 'business_phone', 'business_address'] as const

export type ProfileFormValues = SellerProfileFields

export function toFormValues(p: SellerProfile): ProfileFormValues {
    return {
        business_name: p.business_name ?? '',
        business_description: p.business_description ?? '',
        selling_categories: (p.selling_categories ?? []).map((c) => String(c.id)),
        other_category: p.other_category ?? '',
        business_email: p.business_email ?? '',
        business_phone: p.business_phone ?? '',
        business_address: p.business_address ?? '',
        return_policy: p.return_policy ?? '',
        shipping_policy: p.shipping_policy ?? '',
        is_accepting_orders: p.is_accepting_orders ?? true,
    }
}

/**
 * `locked` (verified or suspended): identity fields are not re-validated, they are stored values.
 * `enforceCategories`: require one category or Other text. On for pending / rejected sellers, when the API
 * lists `selling_categories` as missing, or once the seller edited a category field; otherwise a seller
 * with none saved can still save other changes.
 */
export function buildProfileSchema({ locked, enforceCategories }: { locked: boolean; enforceCategories: boolean }) {
    return Yup.object({
        business_name: locked
            ? Yup.string()
            : Yup.string().trim().min(2, 'Enter your store name').max(255, 'Keep the name under 255 characters'),
        business_description: Yup.string().trim().max(2000, 'Keep the description under 2000 characters'),
        selling_categories: Yup.array(Yup.string().required()).max(MAX_SELLING_CATEGORIES, `Choose up to ${MAX_SELLING_CATEGORIES} categories`),
        other_category: Yup.string().test('other-format', 'Use 3 to 80 characters. Letters, numbers, spaces, & , and - only.', (value) => validateOther(value ?? '') === null),
        business_email: Yup.string().trim().required('Enter a contact email').email('Enter a valid email address').max(254, 'Keep the email under 254 characters'),
        business_phone: locked
            ? Yup.string()
            : Yup.string()
                  .trim()
                  .required('Enter a contact phone number')
                  .test('ghana-mobile', 'Enter a Ghana mobile number, e.g. 024 000 0000', (value) => GHANA_MOBILE.test((value ?? '').replace(/[\s-]/g, ''))),
        business_address: locked
            ? Yup.string()
            : Yup.string().trim().min(5, 'Enter your business address').max(500, 'Keep the address under 500 characters'),
        return_policy: Yup.string().trim().max(5000, 'Keep this under 5000 characters'),
        shipping_policy: Yup.string().trim().max(5000, 'Keep this under 5000 characters'),
        is_accepting_orders: Yup.boolean(),
    }).test('category-required', CATEGORY_REQUIRED_MESSAGE, function (values) {
        if (!enforceCategories || !values) return true
        const ids = (values.selling_categories ?? []) as string[]
        if (ids.length > 0 || normalizeOther(String(values.other_category ?? '')) !== '') return true
        return this.createError({ path: 'selling_categories', message: CATEGORY_REQUIRED_MESSAGE })
    })
}
