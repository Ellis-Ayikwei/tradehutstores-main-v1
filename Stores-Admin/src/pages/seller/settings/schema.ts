import { z } from 'zod';
import type { SellerProfile } from '@/services/sellerProfileService';

/** Ghana mobile: 0XXXXXXXXX, 233XXXXXXXXX or +233XXXXXXXXX (spaces and dashes allowed). */
const GHANA_MOBILE = /^(?:\+?233|0)\d{9}$/;

/** Letters, digits, space, & - , only (no URLs, emails or HTML). */
const OTHER_CATEGORY = /^[\p{L}\p{N} &,-]+$/u;
export const MAX_SELLING_CATEGORIES = 10;
export const normaliseOther = (value: string) => value.trim().replace(/\s+/g, ' ');

const baseSchema = z.object({
    business_name: z.string().trim().min(2, 'Enter your store name').max(255, 'Keep the name under 255 characters'),
    business_description: z.string().trim().max(2000, 'Keep the description under 2000 characters'),
    selling_categories: z.array(z.string()).max(MAX_SELLING_CATEGORIES, `Choose up to ${MAX_SELLING_CATEGORIES} categories`),
    other_category: z
        .string()
        .refine((v) => {
            const text = normaliseOther(v);
            return text === '' || (text.length >= 3 && text.length <= 80);
        }, 'Use 3 to 80 characters')
        .refine((v) => {
            const text = normaliseOther(v);
            return text === '' || OTHER_CATEGORY.test(text);
        }, 'Use only letters, numbers, spaces, & - and commas'),
    business_email: z.string().trim().min(1, 'Enter a contact email').email('Enter a valid email address').max(254, 'Keep the email under 254 characters'),
    business_phone: z
        .string()
        .trim()
        .min(1, 'Enter a contact phone number')
        .refine((v) => GHANA_MOBILE.test(v.replace(/[\s-]/g, '')), 'Enter a Ghana mobile number, e.g. 024 000 0000'),
    business_address: z.string().trim().min(5, 'Enter your business address').max(500, 'Keep the address under 500 characters'),
    return_policy: z.string().trim().max(5000, 'Keep this under 5000 characters'),
    shipping_policy: z.string().trim().max(5000, 'Keep this under 5000 characters'),
    is_accepting_orders: z.boolean(),
});

type BaseValues = z.infer<typeof baseSchema>;

/** At least one category, or a description under Other. */
const requireCategory = (values: BaseValues, ctx: z.RefinementCtx) => {
    if (values.selling_categories.length === 0 && normaliseOther(values.other_category) === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['selling_categories'], message: 'Choose at least one category or describe it under Other.' });
    }
};

/** Verified sellers can't change identity fields, so their (already stored) values are not re-validated. */
export const IDENTITY_LOCKED_FIELDS = ['business_name', 'business_phone', 'business_address'] as const;

const lockedBaseSchema = baseSchema.extend({
    business_name: z.string(),
    business_phone: z.string(),
    business_address: z.string(),
});

/**
 * `enforceCategories` turns on the "at least one category or Other text" rule. The form enables it for pending / rejected
 * sellers, or once the seller has edited either category field; otherwise sellers with none saved can still save other changes.
 */
export function buildProfileSchema({ locked, enforceCategories }: { locked: boolean; enforceCategories: boolean }) {
    const schema = locked ? lockedBaseSchema : baseSchema;
    return enforceCategories ? schema.superRefine(requireCategory) : schema;
}

export type ProfileFormValues = BaseValues;

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
    };
}
