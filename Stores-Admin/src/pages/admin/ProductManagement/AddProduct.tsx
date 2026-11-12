import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Control } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, ArrowLeft, Check, Image as ImageIcon, Loader2, Package, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';
import axiosInstance from '../../../services/axiosInstance';


// Product Status Options
const PRODUCT_STATUS = [
    { value: 'Active', label: 'Active' },
    { value: 'Deactivated', label: 'Deactivated' },
    { value: 'Archived', label: 'Archived' },
    { value: 'Deleted', label: 'Deleted' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Published', label: 'Published' },
    { value: 'Suspended', label: 'Suspended' },
];

// Condition Options
const CONDITION_OPTIONS = [
    { value: 'New', label: 'New' },
    { value: 'Used - Like New', label: 'Used - Like New' },
    { value: 'Used - Good', label: 'Used - Good' },
    { value: 'Used - Fair', label: 'Used - Fair' },
    { value: 'Refurbished', label: 'Refurbished' },
];

// Variation Theme Options
const VARIATION_THEMES = [
    { value: 'single', label: 'Single Product' },
    { value: 'size', label: 'Size' },
    { value: 'color', label: 'Color' },
    { value: 'material', label: 'Material' },
    { value: 'pattern', label: 'Pattern' },
    { value: 'style', label: 'Style' },
    { value: 'capacity', label: 'Capacity' },
    { value: 'memory', label: 'Memory' },
    { value: 'size-color', label: 'Size & Color' },
    { value: 'size-material', label: 'Size & Material' },
    { value: 'color-style', label: 'Color & Style' },
    { value: 'size-pattern', label: 'Size & Pattern' },
    { value: 'size-style', label: 'Size & Style' },
    { value: 'size-color-style', label: 'Size, Color & Style' },
    { value: 'RAM Capacity-memory', label: 'RAM Capacity & Memory' },
    { value: 'custom', label: 'Custom' },
    { value: 'all', label: 'All variants (flat list)' },
];

// Image Types
const IMAGE_TYPES = [
    { value: 'main', label: 'Main Image' },
    { value: 'supplementary', label: 'Supplementary Image' },
    { value: 'infographic', label: 'Infographic Image' },
];

interface Category {
    id: string;
    name: string;
}

interface SubCategory {
    id: string;
    sub_category_name: string;
    category: string;
}

interface Brand {
    id: string;
    name: string;
    category: string;
}

interface Attribute {
    id: string;
    name: string;
}

interface AttributeValue {
    id: string;
    value_name: string;
    attribute: string; // attribute ID
    attribute_name: string; // read-only field from backend
    color_code?: string;
    image?: string;
}

interface Seller {
    id: string;
    business_name?: string;
    user?: {
        email: string;
    };
}

/** Stable React list key for new variants (never use `sku` in `key` — it changes while typing). */
function newVariantClientKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface ProductVariant {
    id?: string;
    /** Client-only; used as row key until the variant has a server `id`. */
    clientRowKey?: string;
    sku: string;
    price: string;
    quantity: number;
    min_buy_amount: number;
    attribute_values: string[];
    attribute_values1?: string;
    attribute_values2?: string;
    name?: string;
    images?: ProductImage[]; // Variant-specific images
}

interface ProductImage {
    id?: string;
    image: File | string | null;
    is_main: boolean;
    product_variant?: string;
    image_type: string;
    preview?: string;
}

interface ProductKeyFeature {
    id?: string;
    name: string;
}

const PRODUCTS_VARIANTS_URL = '/products/variants/';
const PRODUCTS_IMAGES_URL = '/products/images/';
const PRODUCTS_KEY_FEATURES_URL = '/products/key-features/';

function unwrapList(payload: unknown): unknown[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload === 'object' && payload !== null && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: unknown[] }).results;
    }
    return [];
}

function resolveMediaUrl(maybeRelative: unknown): string {
    const s = maybeRelative === null || maybeRelative === undefined ? '' : String(maybeRelative);
    if (!s) return '';
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const base = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}

function buildVariantAttributePayload(variant: ProductVariant): string[] {
    const ids: string[] = [];
    const firstSlot = variant.attribute_values?.[0];
    if (firstSlot) ids.push(String(firstSlot));
    if (variant.attribute_values1) ids.push(String(variant.attribute_values1));
    if (variant.attribute_values2) ids.push(String(variant.attribute_values2));
    return [...new Set(ids.filter(Boolean))];
}

function mapApiVariantToRow(v: Record<string, unknown>, theme: string): ProductVariant {
    const rawAttrs =
        Array.isArray(v.attribute_values)
            ? (v.attribute_values as { id?: string; attribute_name?: string }[])
            : [];
    const dims =
        theme && theme !== 'single'
            ? theme.split('-').map((part) => part.trim().toLowerCase()).filter(Boolean)
            : [];

    const byDimIdx: Record<number, string> = {};
    for (const row of rawAttrs) {
        if (!row.id) continue;
        const attrName = (row.attribute_name || '').trim().toLowerCase();
        const idx = dims.findIndex((dim) => dim === attrName);
        if (idx >= 0) byDimIdx[idx] = String(row.id);
    }

    let attribute_values: string[] = [];
    let attribute_values1 = '';
    let attribute_values2 = '';

    if (dims.length >= 1) {
        attribute_values = byDimIdx[0] ? [byDimIdx[0]] : [];
        attribute_values1 = byDimIdx[1] || '';
        attribute_values2 = byDimIdx[2] || '';
    }

    const idVal = v.id != null ? String(v.id) : undefined;

    return {
        id: idVal,
        clientRowKey: idVal ? undefined : newVariantClientKey(),
        sku: String(v.sku ?? ''),
        price: v.price !== undefined && v.price !== null ? String(v.price) : '',
        quantity: Number(v.quantity ?? 0),
        min_buy_amount: Number(v.min_buy_amount ?? 1),
        attribute_values,
        attribute_values1,
        attribute_values2,
        name: v.name !== undefined && v.name !== null ? String(v.name) : '',
        images: [],
    };
}

function collectTrackedImageIds(vVariants: ProductVariant[], tabImages: ProductImage[]): Set<string> {
    const ids = new Set<string>();
    vVariants.forEach((vv) =>
        vv.images?.forEach((im) => {
            if (im.id) ids.add(im.id);
        }),
    );
    tabImages.forEach((im) => {
        if (im.id) ids.add(im.id);
    });
    return ids;
}

interface Tag {
    id?: string;
    name: string;
}

const productSchema = z.object({
    status: z.string(),
    name: z.string().trim().min(1, 'Product name is required'),
    slug: z.string(),
    keywords: z.string(),
    description: z.string(),
    category: z.string().min(1, 'Category is required'),
    sub_category: z.string().min(1, 'Sub category is required'),
    brand: z.string().min(1, 'Brand is required'),
    store: z.string(),
    condition: z.string(),
    variation_theme: z.string().min(1, 'Variation theme is required'),
    main_product_image: z.custom<File | null>(() => true),
    min_amount: z.number(),
    inventory_level: z.number(),
    available: z.boolean(),
    seller_profile: z.string(),
    meta_title: z.string(),
    meta_description: z.string(),
    discount_percentage: z.number(),
    is_spare_part: z.boolean(),
    requires_installation: z.boolean(),
    is_product_of_the_month: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;
type ProductControl = Control<ProductFormValues>;

const EMPTY_FORM: ProductFormValues = {
    status: 'Draft',
    name: '',
    slug: '',
    keywords: '',
    description: '',
    category: '',
    sub_category: '',
    brand: '',
    store: '',
    condition: '',
    variation_theme: 'single',
    main_product_image: null,
    min_amount: 1,
    inventory_level: 0,
    available: true,
    seller_profile: '',
    meta_title: '',
    meta_description: '',
    discount_percentage: 0,
    is_spare_part: false,
    requires_installation: false,
    is_product_of_the_month: false,
};

interface SelectOption {
    value: string;
    label: string;
}

const NONE_VALUE = '__none';

/** Radix Select cannot use '' as an item value, so an optional "none" row maps to a sentinel. */
function OptionSelect({
    value,
    onChange,
    options,
    placeholder,
    noneLabel,
    disabled,
    id,
    invalid,
    describedBy,
    ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder: string;
    noneLabel?: string;
    disabled?: boolean;
    id?: string;
    invalid?: boolean;
    describedBy?: string;
    ariaLabel?: string;
}) {
    return (
        <Select value={value || (noneLabel ? NONE_VALUE : '')} onValueChange={(v) => onChange(v === NONE_VALUE ? '' : v)} disabled={disabled}>
            <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={describedBy} aria-label={ariaLabel}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {noneLabel ? <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem> : null}
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** OptionSelect wired to the surrounding <FormField>/<FormItem> (id, aria and error state). */
function FieldSelect(props: Omit<React.ComponentProps<typeof OptionSelect>, 'id' | 'invalid' | 'describedBy'>) {
    const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
    return <OptionSelect {...props} id={formItemId} invalid={!!error} describedBy={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId} />;
}

type ProductFieldName = keyof ProductFormValues;

function TextField({
    control,
    name,
    label,
    required,
    placeholder,
    description,
    className,
    mono,
    multiline,
    rows,
    numeric,
    min,
    max,
}: {
    control: ProductControl;
    name: ProductFieldName;
    label: string;
    required?: boolean;
    placeholder?: string;
    description?: string;
    className?: string;
    mono?: boolean;
    multiline?: boolean;
    rows?: number;
    numeric?: boolean;
    min?: number;
    max?: number;
}) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={cn('space-y-1.5', className)}>
                    <FormLabel>
                        {label}
                        {required ? <span className="text-destructive"> *</span> : null}
                    </FormLabel>
                    <FormControl>
                        {multiline ? (
                            <Textarea ref={field.ref} name={field.name} onBlur={field.onBlur} value={String(field.value ?? '')} onChange={field.onChange} rows={rows} placeholder={placeholder} />
                        ) : numeric ? (
                            <Input
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                type="number"
                                min={min}
                                max={max}
                                value={Number(field.value ?? 0)}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || (min ?? 0))}
                            />
                        ) : (
                            <Input
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                value={String(field.value ?? '')}
                                onChange={field.onChange}
                                placeholder={placeholder}
                                autoComplete="off"
                                className={cn(mono && 'font-mono text-sm')}
                            />
                        )}
                    </FormControl>
                    {description ? <FormDescription className="text-xs">{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function SwitchField({ control, name, label }: { control: ProductControl; name: ProductFieldName; label: string }) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3 space-y-0 rounded-xl border p-3">
                    <FormLabel className="cursor-pointer">{label}</FormLabel>
                    <FormControl>
                        <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}

const AddProduct: React.FC = () => {
    const navigate = useNavigate();
    const { id: editProductId } = useParams<{ id?: string }>();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('basic');
    const [variantToRemove, setVariantToRemove] = useState<number | null>(null);

    // Dropdown data
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
    // Store attribute values grouped by attribute name (for separate dropdowns)
    const [attributeGroups, setAttributeGroups] = useState<Record<string, AttributeValue[]>>({});
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form state - using plain React state like the rest of the codebase
    const suppressCategoryCascadeRef = useRef(false);
    const baselineVariantIdsRef = useRef<Set<string>>(new Set());
    const baselineImageIdsRef = useRef<Set<string>>(new Set());
    const baselineKeyFeatureIdsRef = useRef<Set<string>>(new Set());
    const persistedDefaultVariantIdRef = useRef<string | null>(null);
    const [heroBlobUrl, setHeroBlobUrl] = useState<string | null>(null);
    const [serverHeroUrl, setServerHeroUrl] = useState<string | null>(null);

    const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: EMPTY_FORM, mode: 'onTouched' });
    const formData = form.watch();

    const [variants, setVariants] = useState<ProductVariant[]>([
        {
            clientRowKey: newVariantClientKey(),
            sku: '',
            price: '',
            quantity: 0,
            min_buy_amount: 1,
            attribute_values: [],
        },
    ]);

    const [images, setImages] = useState<ProductImage[]>([]);
    const [keyFeatures, setKeyFeatures] = useState<ProductKeyFeature[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);

    const fetchCatalogSelections = async () => {
        const [categoriesRes, attributesRes, sellersRes] = await Promise.all([
            axiosInstance.get('/catalog/categories/').catch(() => ({ data: [] })),
            axiosInstance.get('/catalog/attributes/').catch(() => ({ data: [] })),
            axiosInstance.get('/sellers/list/').catch(() => ({ data: [] })),
        ]);

        const categoriesData = Array.isArray(categoriesRes.data)
            ? categoriesRes.data
            : categoriesRes.data?.results || [];
        const attributesData = Array.isArray(attributesRes.data)
            ? attributesRes.data
            : attributesRes.data?.results || [];
        const sellersData = Array.isArray(sellersRes.data) ? sellersRes.data : sellersRes.data?.results || [];

        setCategories(categoriesData);
        setAttributes(attributesData);
        setSellers(sellersData);
    };

    const fetchDropdownData = async () => {
        try {
            setLoadingData(true);
            await fetchCatalogSelections();
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
            toast.error('Failed to load dropdown data');
        } finally {
            setLoadingData(false);
        }
    };

    const fetchSubCategories = async (categoryId: string, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await axiosInstance.get('/catalog/subcategories/', {
                params: { category: categoryId },
            });
            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.results || [];
            setSubCategories(data);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            setSubCategories([]);
            toast.warning('Could not load subcategories. Please try again.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchBrands = async (categoryId: string, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await axiosInstance.get('/catalog/brands/', {
                params: { category: categoryId },
            });
            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.results || [];
            setBrands(data);
        } catch (error) {
            console.error('Error fetching brands:', error);
            setBrands([]);
            toast.warning('Could not load brands. Please try again.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchAttributeValuesForTheme = async (theme: string) => {
        try {
            const attributeNames = theme.split('-');
            const allValues: AttributeValue[] = [];
            const groupedValues: Record<string, AttributeValue[]> = {};

            for (const attrName of attributeNames) {
                const trimmedName = attrName.trim();
                try {
                    const response = await axiosInstance.get('/catalog/attribute-values/', {
                        params: { attribute_name: trimmedName },
                    });
                    const data = Array.isArray(response.data)
                        ? response.data
                        : response.data?.results || [];
                    allValues.push(...data);
                    // Group by attribute name for separate dropdowns
                    groupedValues[trimmedName] = data;
                } catch (e) {
                    console.warn(`Could not fetch attribute values for ${trimmedName}:`, e);
                    groupedValues[trimmedName] = [];
                    continue;
                }
            }

            setAttributeValues(allValues);
            setAttributeGroups(groupedValues);
        } catch (error) {
            console.error('Error fetching attribute values:', error);
            setAttributeValues([]);
            setAttributeGroups({});
        }
    };

    const loadExistingProduct = async (pid: string) => {
        suppressCategoryCascadeRef.current = true;
        setLoadingData(true);
        try {
            await fetchCatalogSelections();
            const prodRes = await axiosInstance.get(`/products/${pid}/`);
            const raw = prodRes.data as Record<string, unknown>;
            persistedDefaultVariantIdRef.current =
                raw.default_variant != null ? String(raw.default_variant) : null;

            const categoryId = String(raw.category ?? '');
            await fetchSubCategories(categoryId, true);
            await fetchBrands(categoryId, true);

            const theme = raw.variation_theme != null ? String(raw.variation_theme) : 'single';
            if (theme !== 'single') {
                await fetchAttributeValuesForTheme(theme);
            } else {
                setAttributeValues([]);
                setAttributeGroups({});
            }

            let variantRowsPayload: Record<string, unknown>[] = [];
            try {
                const vr = await axiosInstance.get(`/products/${pid}/variants/`);
                variantRowsPayload = unwrapList(vr.data) as Record<string, unknown>[];
            } catch {
                variantRowsPayload = [];
            }

            let gallRows: Record<string, unknown>[] = [];
            try {
                const gr = await axiosInstance.get(`/products/${pid}/images/`);
                gallRows = unwrapList(gr.data) as Record<string, unknown>[];
            } catch {
                gallRows = [];
            }

            let featRowsPayload: Record<string, unknown>[] = [];
            try {
                const fr = await axiosInstance.get(`/products/key-features/?product=${encodeURIComponent(pid)}`);
                featRowsPayload = unwrapList(fr.data) as Record<string, unknown>[];
            } catch {
                featRowsPayload = [];
            }

            baselineVariantIdsRef.current = new Set(
                variantRowsPayload.map((row) => (row.id != null ? String(row.id) : '')).filter(Boolean),
            );
            baselineImageIdsRef.current = new Set(
                gallRows.map((row) => (row.id != null ? String(row.id) : '')).filter(Boolean),
            );

            const mappedVariants: ProductVariant[] = variantRowsPayload.map((row) => mapApiVariantToRow(row, theme));

            const vidToSku = new Map<string, string>();
            mappedVariants.forEach((mv) => {
                if (mv.id) vidToSku.set(mv.id, mv.sku);
            });

            const tabImagesSeed: ProductImage[] = [];

            gallRows.forEach((gRow) => {
                const fk = gRow.product_variant != null ? String(gRow.product_variant) : '';
                const urlAbs = resolveMediaUrl(gRow.image);
                const row: ProductImage = {
                    id: gRow.id != null ? String(gRow.id) : undefined,
                    image: urlAbs || null,
                    is_main: Boolean(gRow.is_main),
                    image_type: String(gRow.image_type ?? 'supplementary'),
                    preview: urlAbs || undefined,
                };

                const vIdx = fk ? mappedVariants.findIndex((v) => v.id === fk) : -1;

                if (vIdx >= 0) {
                    const bucket = mappedVariants[vIdx].images ?? [];
                    bucket.push(row);
                    mappedVariants[vIdx].images = bucket;
                } else if (mappedVariants.length > 0) {
                    tabImagesSeed.push({
                        ...row,
                        product_variant:
                            fk && vidToSku.has(fk) ? vidToSku.get(fk)! : mappedVariants[0]?.sku ?? '',
                    });
                }
            });

            baselineKeyFeatureIdsRef.current = new Set(
                featRowsPayload.map((feat) => (feat.id != null ? String(feat.id) : '')).filter(Boolean),
            );
            const featureState: ProductKeyFeature[] = featRowsPayload.map((feat) => ({
                id: feat.id != null ? String(feat.id) : undefined,
                name: String(feat.name ?? ''),
            }));

            const heroAbs = resolveMediaUrl(raw.main_product_image);
            setServerHeroUrl(heroAbs || null);
            setHeroBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });

            form.reset({
                status: raw.status != null ? String(raw.status) : 'Draft',
                name: String(raw.name ?? ''),
                slug: raw.slug != null ? String(raw.slug) : '',
                keywords: raw.keywords != null ? String(raw.keywords) : '',
                description: raw.description != null ? String(raw.description) : '',
                category: categoryId,
                sub_category: raw.sub_category != null ? String(raw.sub_category) : '',
                brand: raw.brand != null ? String(raw.brand) : '',
                store: raw.store != null ? String(raw.store) : '',
                condition: raw.condition != null ? String(raw.condition) : '',
                variation_theme: theme,
                main_product_image: null,
                min_amount: Number(raw.min_amount ?? 1) || 1,
                inventory_level: Number(raw.inventory_level ?? 0) || 0,
                available: Boolean(raw.available),
                seller_profile: raw.seller_profile != null ? String(raw.seller_profile) : '',
                meta_title: raw.meta_title != null ? String(raw.meta_title) : '',
                meta_description: raw.meta_description != null ? String(raw.meta_description) : '',
                discount_percentage:
                    typeof raw.discount_percentage === 'number'
                        ? raw.discount_percentage
                        : Number(raw.discount_percentage ?? 0) || 0,
                is_spare_part: Boolean(raw.is_spare_part),
                requires_installation: Boolean(raw.requires_installation),
                is_product_of_the_month: Boolean(raw.is_product_of_the_month),
            });

            const variantState =
                mappedVariants.length > 0
                    ? mappedVariants
                    : [
                          {
                              clientRowKey: newVariantClientKey(),
                              sku: '',
                              price: '',
                              quantity: 0,
                              min_buy_amount: 1,
                              attribute_values: [],
                              images: [],
                          },
                      ];
            setVariants(variantState);
            setImages(tabImagesSeed);
            setKeyFeatures(featureState);
            setTags([]);
        } catch (error) {
            console.error('Edit load failed', error);
            toast.error('Could not load product for editing');
            navigate('/admin/products/list');
        } finally {
            suppressCategoryCascadeRef.current = false;
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (editProductId) {
            void loadExistingProduct(editProductId);
            return;
        }
        fetchDropdownData();
    }, [editProductId]);

    useEffect(() => {
        return () => {
            if (heroBlobUrl) URL.revokeObjectURL(heroBlobUrl);
        };
    }, [heroBlobUrl]);

    useEffect(() => {
        if (suppressCategoryCascadeRef.current) {
            return;
        }
        if (formData.category) {
            fetchSubCategories(formData.category);
        } else {
            setSubCategories([]);
            form.setValue('sub_category', '');
        }
    }, [formData.category]);

    useEffect(() => {
        if (suppressCategoryCascadeRef.current) {
            return;
        }
        if (formData.category) {
            fetchBrands(formData.category);
        } else {
            setBrands([]);
            form.setValue('brand', '');
        }
    }, [formData.category]);

    useEffect(() => {
        if (suppressCategoryCascadeRef.current) {
            return;
        }
        if (formData.variation_theme && formData.variation_theme !== 'single') {
            fetchAttributeValuesForTheme(formData.variation_theme);
        } else {
            setAttributeValues([]);
            setAttributeGroups({});
        }
    }, [formData.variation_theme]);

    // Variant management
    const addVariant = () => {
        const newVariant: ProductVariant = {
            clientRowKey: newVariantClientKey(),
            sku: '',
            price: '',
            quantity: 0,
            min_buy_amount: 1,
            attribute_values: [],
            images: [], // Initialize empty images array
        };
        
        // Initialize attribute group selections if variation theme is set
        if (formData.variation_theme && formData.variation_theme !== 'single') {
            const attributeNames = formData.variation_theme.split('-');
            if (attributeNames.length > 0) newVariant.attribute_values = [];
            if (attributeNames.length > 1) newVariant.attribute_values1 = '';
            if (attributeNames.length > 2) newVariant.attribute_values2 = '';
        }
        
        setVariants([...variants, newVariant]);
    };

    // Variant image management
    const handleVariantImageUpload = (variantIndex: number, files: FileList | null) => {
        if (!files) return;
        const updated = [...variants];
        if (!updated[variantIndex].images) {
            updated[variantIndex].images = [];
        }
        
        const newImages: ProductImage[] = Array.from(files).map((file) => ({
            image: file,
            is_main: updated[variantIndex].images!.length === 0,
            image_type: 'supplementary',
            preview: URL.createObjectURL(file),
        }));
        
        updated[variantIndex].images = [...updated[variantIndex].images!, ...newImages];
        setVariants(updated);
    };

    const removeVariantImage = (variantIndex: number, imageIndex: number) => {
        const updated = [...variants];
        if (updated[variantIndex].images) {
            const image = updated[variantIndex].images![imageIndex];
            if (image.preview) {
                URL.revokeObjectURL(image.preview);
            }
            updated[variantIndex].images = updated[variantIndex].images!.filter((_, i) => i !== imageIndex);
            setVariants(updated);
        }
    };

    const setVariantMainImage = (variantIndex: number, imageIndex: number) => {
        const updated = [...variants];
        if (updated[variantIndex].images) {
            updated[variantIndex].images = updated[variantIndex].images!.map((img, i) => ({
                ...img,
                is_main: i === imageIndex,
            }));
            setVariants(updated);
        }
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        setVariants(updated);
    };

    // Image management
    const handleImageUpload = (files: FileList | null) => {
        if (!files) return;

        const newImages: ProductImage[] = Array.from(files).map((file) => ({
            image: file,
            is_main: images.length === 0, // First image is main by default
            image_type: 'supplementary',
            preview: URL.createObjectURL(file),
        }));

        setImages([...images, ...newImages]);
    };

    const removeImage = (index: number) => {
        const image = images[index];
        if (image.preview) {
            URL.revokeObjectURL(image.preview);
        }
        const updated = images.filter((_, i) => i !== index);
        // If we removed the main image, make the first remaining image main
        if (image.is_main && updated.length > 0) {
            updated[0].is_main = true;
        }
        setImages(updated);
    };

    const setMainImage = (index: number) => {
        const updated = images.map((img, i) => ({
            ...img,
            is_main: i === index,
        }));
        setImages(updated);
    };

    // Images already attached to variants (the edit loader files every saved image under its
    // variant). Shown read-only on the Images tab so that tab isn't misleadingly empty.
    const variantGalleryRows = variants.flatMap((variant, vIndex) =>
        (variant.images ?? []).flatMap((img, iIndex) => {
            const src = img.preview || (typeof img.image === 'string' ? img.image : '');
            if (!src) return [];
            return [
                {
                    src,
                    key: String(img.id ?? `v${vIndex}-i${iIndex}`),
                    label: variant.sku || `Variant ${vIndex + 1}`,
                    isMain: img.is_main,
                    imageType: img.image_type,
                },
            ];
        }),
    );

    // Key Features management
    const addKeyFeature = () => {
        setKeyFeatures([...keyFeatures, { name: '' }]);
    };

    const removeKeyFeature = (index: number) => {
        setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
    };

    const updateKeyFeature = (index: number, value: string) => {
        const updated = [...keyFeatures];
        updated[index].name = value;
        setKeyFeatures(updated);
    };

    // Tags management
    const addTag = () => {
        setTags([...tags, { name: '' }]);
    };

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const updateTag = (index: number, value: string) => {
        const updated = [...tags];
        updated[index].name = value;
        setTags(updated);
    };

    // Form submission
    const handleSubmit = async () => {
        if (variants.length === 0) {
            toast.error('At least one product variant is required');
            setActiveTab('variants');
            return;
        }

        const anchorSku = (): string =>
            variants.map((vv) => vv.sku.trim()).filter(Boolean)[0] || '';

        const variantPayloadFactory = (productPk: string) => (variant: ProductVariant) => ({
            product: productPk,
            sku: variant.sku,
            price: variant.price,
            quantity: variant.quantity,
            min_buy_amount: variant.min_buy_amount,
            attribute_values: buildVariantAttributePayload(variant),
            name: variant.name?.trim() || '',
        });

        const apiErrorDetail = (err: unknown): string => {
            if (err && typeof err === 'object' && 'response' in err) {
                const r = err as { response?: { data?: Record<string, unknown> } };
                const d = r.response?.data;
                if (!d) return 'Request failed';
                if (typeof d.detail === 'string') return d.detail;
                try {
                    return JSON.stringify(d).slice(0, 900);
                } catch {
                    return 'Request failed';
                }
            }
            return err instanceof Error ? err.message : 'Request failed';
        };

        setSubmitting(true);
        try {
            if (!editProductId) {
                const submitFormData = new FormData();
                (Object.keys(formData) as (keyof typeof formData)[]).forEach((key) => {
                    if (key === 'main_product_image') return;
                    const value = formData[key];
                    if (value === null || value === undefined) return;
                    if (typeof value === 'boolean') {
                        submitFormData.append(key, value ? 'true' : 'false');
                        return;
                    }
                    submitFormData.append(key, String(value));
                });
                if (formData.main_product_image instanceof File) {
                    submitFormData.append('main_product_image', formData.main_product_image);
                }

                const productResponse = await axiosInstance.post('/products/', submitFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const productId = String(productResponse.data.id);
                const variantIdMap: Record<string, string> = {};
                const makePayloadNew = variantPayloadFactory(productId);

                for (const variant of variants) {
                    const variantResponse = await axiosInstance.post(PRODUCTS_VARIANTS_URL, makePayloadNew(variant));
                    variantIdMap[variant.sku] = String(variantResponse.data.id);
                }

                const anchor = anchorSku();

                const postImageBlob = async (variantPk: string, row: ProductImage, blob: File) => {
                    const fd = new FormData();
                    fd.append('product', productId);
                    fd.append('product_variant', variantPk);
                    fd.append('image', blob);
                    fd.append('is_main', row.is_main ? 'true' : 'false');
                    fd.append('image_type', row.image_type);
                    await axiosInstance.post(PRODUCTS_IMAGES_URL, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                };

                for (const variant of variants) {
                    const vk = variantIdMap[variant.sku];
                    if (!variant.images?.length) continue;
                    for (const im of variant.images) {
                        if (im.image instanceof File) await postImageBlob(vk, im, im.image);
                    }
                }

                for (const img of images) {
                    if (!(img.image instanceof File)) continue;
                    const targetSku = img.product_variant?.trim() || anchor;
                    const variantPk =
                        variantIdMap[targetSku] ||
                        variantIdMap[anchor] ||
                        Object.values(variantIdMap)[0];
                    if (!variantPk) {
                        toast.error('Link gallery uploads to a variant SKU or add variants first.');
                        throw new Error('missing-variant');
                    }
                    await postImageBlob(variantPk, img, img.image);
                }

                for (const feature of keyFeatures) {
                    if (!feature.name.trim()) continue;
                    await axiosInstance.post(PRODUCTS_KEY_FEATURES_URL, {
                        product: productId,
                        name: feature.name.trim(),
                    });
                }

                for (const tag of tags) {
                    if (!tag.name.trim()) continue;
                    try {
                        await axiosInstance.post('/tags/', { product: productId, name: tag.name.trim() });
                    } catch {
                        try {
                            await axiosInstance.post(`/products/${productId}/tags/`, {
                                name: tag.name.trim(),
                            });
                        } catch (e) {
                            console.warn('Could not create tag:', tag.name, e);
                        }
                    }
                }

                toast.success('Product created successfully');

                navigate('/admin/products/list');
                return;
            }

            /** Update existing catalog product */
            const pid = editProductId;
            const patchJson = {
                status: formData.status || null,
                name: formData.name,
                keywords: formData.keywords || '',
                description: formData.description || '',
                slug: formData.slug?.trim() ? formData.slug.trim() : null,
                category: formData.category,
                sub_category: formData.sub_category,
                brand: formData.brand,
                store: formData.store?.trim() ? formData.store.trim() : null,
                condition: formData.condition || null,
                variation_theme: formData.variation_theme,
                min_amount: formData.min_amount,
                inventory_level: formData.inventory_level,
                available: formData.available,
                seller_profile: formData.seller_profile?.trim() ? formData.seller_profile.trim() : null,
                meta_title: formData.meta_title || '',
                meta_description: formData.meta_description || '',
                discount_percentage: formData.discount_percentage,
                is_spare_part: formData.is_spare_part,
                requires_installation: formData.requires_installation,
                is_product_of_the_month: formData.is_product_of_the_month,
            };

            await axiosInstance.patch(`/products/${pid}/`, patchJson);

            if (formData.main_product_image instanceof File) {
                const heroFd = new FormData();
                heroFd.append('main_product_image', formData.main_product_image);
                await axiosInstance.patch(`/products/${pid}/`, heroFd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            const variantIdsBySku: Record<string, string> = {};
            const makePayloadExisting = variantPayloadFactory(pid);

            for (const variant of variants) {
                if (variant.id) {
                    await axiosInstance.patch(`${PRODUCTS_VARIANTS_URL}${variant.id}/`, makePayloadExisting(variant));
                    variantIdsBySku[variant.sku] = String(variant.id);
                }
            }

            for (const variant of variants.filter((row) => !row.id)) {
                const vr = await axiosInstance.post(PRODUCTS_VARIANTS_URL, makePayloadExisting(variant));
                variantIdsBySku[variant.sku] = String(vr.data.id);
            }

            const allCurrentVariantPks = new Set<string>();
            variants.forEach((v) => {
                const pk = v.id ? String(v.id) : variantIdsBySku[v.sku];
                if (pk) allCurrentVariantPks.add(pk);
            });

            for (const staleId of baselineVariantIdsRef.current) {
                if (!allCurrentVariantPks.has(staleId)) {
                    await axiosInstance.delete(`${PRODUCTS_VARIANTS_URL}${staleId}/`);
                }
            }

            const resolveGalleryVariantPk = (maybeSku?: string) => {
                const anchor = anchorSku();
                return variantIdsBySku[maybeSku?.trim() || anchor] || variantIdsBySku[anchor];
            };

            /** Metadata updates on existing uploaded images */
            for (const variant of variants) {
                if (!variant.id) continue;
                const varPk = String(variant.id);
                if (!variant.images?.length) continue;
                for (const im of variant.images) {
                    if (!im.id || im.image instanceof File) continue;
                    await axiosInstance.patch(`${PRODUCTS_IMAGES_URL}${im.id}/`, {
                        is_main: im.is_main,
                        image_type: im.image_type,
                        product_variant: varPk,
                    });
                }
            }

            for (const im of images) {
                if (!im.id || im.image instanceof File) continue;
                const vk = resolveGalleryVariantPk(im.product_variant);
                if (!vk) continue;
                await axiosInstance.patch(`${PRODUCTS_IMAGES_URL}${im.id}/`, {
                    is_main: im.is_main,
                    image_type: im.image_type,
                    product_variant: vk,
                });
            }

            const aliveTracked = collectTrackedImageIds(variants, images);
            for (const oldImgId of baselineImageIdsRef.current) {
                if (!aliveTracked.has(oldImgId)) {
                    await axiosInstance.delete(`${PRODUCTS_IMAGES_URL}${oldImgId}/`);
                }
            }

            const postImageBlobPid = async (variantPk: string, row: ProductImage, blob: File) => {
                const fd = new FormData();
                fd.append('product', pid);
                fd.append('product_variant', variantPk);
                fd.append('image', blob);
                fd.append('is_main', row.is_main ? 'true' : 'false');
                fd.append('image_type', row.image_type);
                await axiosInstance.post(PRODUCTS_IMAGES_URL, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            };

            for (const variant of variants) {
                const vk = variant.id ? String(variant.id) : variantIdsBySku[variant.sku];
                if (!vk || !variant.images?.length) continue;
                for (const im of variant.images) {
                    if (im.image instanceof File) await postImageBlobPid(vk, im, im.image);
                }
            }

            for (const im of images) {
                if (!(im.image instanceof File)) continue;
                const vk = resolveGalleryVariantPk(im.product_variant);
                if (!vk) {
                    toast.error('Select a variant SKU for each new gallery upload.');
                    throw new Error('missing-variant-gall');
                }
                await postImageBlobPid(vk, im, im.image);
            }

            const aliveFeatureIds = new Set(
                keyFeatures.filter((f) => f.id).map((f) => String(f.id)),
            );
            for (const staleFeat of baselineKeyFeatureIdsRef.current) {
                if (!aliveFeatureIds.has(staleFeat)) {
                    await axiosInstance.delete(`${PRODUCTS_KEY_FEATURES_URL}${staleFeat}/`);
                }
            }

            for (const feat of keyFeatures) {
                const trimmed = feat.name.trim();
                if (feat.id) {
                    if (trimmed.length) {
                        await axiosInstance.patch(`${PRODUCTS_KEY_FEATURES_URL}${feat.id}/`, {
                            product: pid,
                            name: trimmed,
                        });
                    } else {
                        await axiosInstance.delete(`${PRODUCTS_KEY_FEATURES_URL}${feat.id}/`);
                    }
                } else if (trimmed.length) {
                    await axiosInstance.post(PRODUCTS_KEY_FEATURES_URL, {
                        product: pid,
                        name: trimmed,
                    });
                }
            }

            let defaultVariantPk: string | null = persistedDefaultVariantIdRef.current;
            if (defaultVariantPk && !allCurrentVariantPks.has(defaultVariantPk)) {
                defaultVariantPk = null;
            }
            if (!defaultVariantPk && variants.length) {
                const v0 = variants[0];
                defaultVariantPk = (v0.id && String(v0.id)) || variantIdsBySku[v0.sku] || null;
            }

            await axiosInstance.patch(`/products/${pid}/`, {
                default_variant: defaultVariantPk,
            });

            toast.success('Product updated');
            navigate(`/admin/products/${pid}`);
        } catch (error: unknown) {
            console.error('Save product failed', error);
            toast.error(apiErrorDetail(error));
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData) {
        return (
            <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-full max-w-xl" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    const subDisabled = !formData.category || loading;
    const attributeNames = formData.variation_theme && formData.variation_theme !== 'single' ? formData.variation_theme.split('-') : [];
    const showAttributeSelects = attributeNames.length > 0 && Object.keys(attributeGroups).length > 0;

    const getAttributeSlotValue = (variant: ProductVariant, slot: number): string => {
        if (slot === 0) return Array.isArray(variant.attribute_values) && variant.attribute_values.length > 0 ? variant.attribute_values[0] : '';
        return (slot === 1 ? variant.attribute_values1 : variant.attribute_values2) || '';
    };

    const setAttributeSlotValue = (index: number, slot: number, value: string) => {
        if (slot === 0) updateVariant(index, 'attribute_values', value ? [value] : []);
        else updateVariant(index, slot === 1 ? 'attribute_values1' : 'attribute_values2', value);
    };

    const updateVariantImageType = (variantIndex: number, imageIndex: number, imageType: string) => {
        setVariants((prev) =>
            prev.map((v, vi) =>
                vi !== variantIndex ? v : { ...v, images: (v.images ?? []).map((im, ii) => (ii === imageIndex ? { ...im, image_type: imageType } : im)) }
            )
        );
    };

    const updateGalleryImage = (index: number, patch: Partial<ProductImage>) => {
        setImages((prev) => prev.map((im, i) => (i === index ? { ...im, ...patch } : im)));
    };

    const onValid = () => {
        void handleSubmit();
    };
    const onInvalid = () => {
        toast.error('Please fill in all required fields');
        setActiveTab('basic');
    };

    const TAB_DEFS = [
        { id: 'basic', label: 'Basic information', icon: Package },
        { id: 'variants', label: 'Variants', icon: Tag },
        { id: 'images', label: 'Images', icon: ImageIcon },
        { id: 'features', label: 'Key features', icon: Check },
        { id: 'tags', label: 'Tags', icon: Tag },
    ];

    const sectionHeader = (title: string, description: string, action?: React.ReactNode) => (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {action}
        </div>
    );

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onValid, onInvalid)}
                onKeyDown={(e) => {
                    // Enter inside a text input must not submit the whole product.
                    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
                }}
                noValidate
                className="space-y-3"
            >
                <div className="flex items-start gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/admin/products/list')} aria-label="Back to products" className="mt-0.5 shrink-0">
                        <ArrowLeft />
                    </Button>
                    <PageHeader
                        className="min-w-0 flex-1 pb-0"
                        title={editProductId ? 'Edit product' : 'Add new product'}
                        description={editProductId ? 'Update catalog fields, variants, gallery images and key features' : 'Create a new product in the catalog'}
                        actions={
                            editProductId ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/admin/products/${editProductId}`)}>
                                    View detail
                                </Button>
                            ) : undefined
                        }
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <TabsList className="w-max">
                            {TAB_DEFS.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <TabsTrigger key={t.id} value={t.id}>
                                        <Icon aria-hidden="true" />
                                        {t.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {/* Basic information */}
                    <TabsContent value="basic">
                        <Card>
                            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
                                {sectionHeader('Product details', 'Fill in the basic information about the product')}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <TextField control={form.control} name="name" label="Product name" required placeholder="Enter product name" />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>Status</FormLabel>
                                                <FieldSelect value={field.value} onChange={field.onChange} options={PRODUCT_STATUS} placeholder="Select status" />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <TextField control={form.control} name="keywords" label="Keywords" placeholder="Enter keywords (comma-separated)" />
                                    <TextField
                                        control={form.control}
                                        name="slug"
                                        label="Slug"
                                        placeholder="seo-friendly-slug"
                                        description="Leave blank on create to auto-generate from brand + title on the backend."
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>
                                                    Category <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FieldSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                                    placeholder="Select a category"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sub_category"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>
                                                    Sub category <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FieldSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    disabled={subDisabled}
                                                    options={subCategories.map((sc) => ({ value: sc.id, label: sc.sub_category_name }))}
                                                    placeholder={!formData.category ? 'Select a category first' : loading ? 'Loading...' : 'Select a sub category'}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="brand"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>
                                                    Brand <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FieldSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    disabled={subDisabled}
                                                    options={brands.map((b) => ({ value: b.id, label: b.name }))}
                                                    placeholder={!formData.category ? 'Select a category first' : loading ? 'Loading...' : 'Select a brand'}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="condition"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>Condition</FormLabel>
                                                <FieldSelect value={field.value} onChange={field.onChange} options={CONDITION_OPTIONS} placeholder="Select condition" noneLabel="No condition" />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="variation_theme"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>
                                                    Variation theme <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FieldSelect value={field.value} onChange={field.onChange} options={VARIATION_THEMES} placeholder="Select a theme" />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <TextField control={form.control} name="description" label="Description" multiline rows={4} placeholder="Enter product description" className="sm:col-span-2" />
                                    <TextField control={form.control} name="min_amount" label="Minimum amount" numeric min={1} />
                                    <TextField control={form.control} name="inventory_level" label="Inventory level" numeric min={0} />
                                    <TextField control={form.control} name="discount_percentage" label="Discount percentage" numeric min={0} max={100} />
                                    <FormField
                                        control={form.control}
                                        name="seller_profile"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel>Seller</FormLabel>
                                                <FieldSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={sellers.map((s) => ({ value: s.id, label: s.business_name || s.user?.email || s.id }))}
                                                    placeholder="Select a seller (optional)"
                                                    noneLabel="No seller"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <TextField control={form.control} name="store" label="Store (FK UUID)" placeholder="Optional store id" mono />

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label htmlFor="main-product-image">Main product image</Label>
                                        {heroBlobUrl || serverHeroUrl ? (
                                            <div className="overflow-hidden rounded-xl border bg-muted">
                                                <img src={(heroBlobUrl || serverHeroUrl) as string} alt="Hero preview" className="mx-auto max-h-48 w-auto object-contain" />
                                            </div>
                                        ) : null}
                                        <Input
                                            id="main-product-image"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setHeroBlobUrl(file ? URL.createObjectURL(file) : null);
                                                setServerHeroUrl(null);
                                                form.setValue('main_product_image', file, { shouldDirty: true });
                                            }}
                                        />
                                    </div>

                                    <TextField control={form.control} name="meta_title" label="Meta title" placeholder="SEO meta title" className="sm:col-span-2" />
                                    <TextField control={form.control} name="meta_description" label="Meta description" multiline rows={2} placeholder="SEO meta description" className="sm:col-span-2" />

                                    <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                                        <SwitchField control={form.control} name="available" label="Available" />
                                        <SwitchField control={form.control} name="is_spare_part" label="Is spare part" />
                                        <SwitchField control={form.control} name="requires_installation" label="Requires installation" />
                                        <SwitchField control={form.control} name="is_product_of_the_month" label="Product of the month" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Variants */}
                    <TabsContent value="variants">
                        <Card>
                            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
                                {sectionHeader(
                                    'Product variants',
                                    'Add product variants with different attributes',
                                    <Button type="button" size="sm" onClick={addVariant}>
                                        <Plus />
                                        Add variant
                                    </Button>
                                )}

                                {variants.length === 0 ? (
                                    <div className="flex items-start gap-2 rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning-subtle-foreground" role="alert">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                        <p>At least one variant is required. Please add a variant.</p>
                                    </div>
                                ) : null}

                                <div className="space-y-4">
                                    {variants.map((variant, index) => (
                                        <div key={variant.id ?? variant.clientRowKey ?? `variant-${index}`} className="rounded-2xl border p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-foreground">Variant {index + 1}</h3>
                                                {variants.length > 1 ? (
                                                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove variant ${index + 1}`} onClick={() => setVariantToRemove(index)}>
                                                        <Trash2 className="text-destructive" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`v-${index}-sku`}>
                                                        SKU <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input id={`v-${index}-sku`} placeholder="Enter SKU" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`v-${index}-price`}>
                                                        Price <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id={`v-${index}-price`}
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={variant.price}
                                                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`v-${index}-qty`}>Quantity</Label>
                                                    <Input
                                                        id={`v-${index}-qty`}
                                                        type="number"
                                                        min={0}
                                                        value={variant.quantity}
                                                        onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`v-${index}-min`}>Min buy amount</Label>
                                                    <Input
                                                        id={`v-${index}-min`}
                                                        type="number"
                                                        min={1}
                                                        value={variant.min_buy_amount}
                                                        onChange={(e) => updateVariant(index, 'min_buy_amount', parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                {showAttributeSelects
                                                    ? attributeNames.slice(0, 3).map((attrName, slot) =>
                                                          attributeGroups[attrName] ? (
                                                              <div key={`${attrName}-${slot}`} className="space-y-1.5 sm:col-span-2">
                                                                  <Label htmlFor={`v-${index}-attr-${slot}`} className="capitalize">
                                                                      {attrName} <span className="text-destructive">*</span>
                                                                  </Label>
                                                                  <OptionSelect
                                                                      id={`v-${index}-attr-${slot}`}
                                                                      value={getAttributeSlotValue(variant, slot)}
                                                                      onChange={(v) => setAttributeSlotValue(index, slot, v)}
                                                                      options={attributeGroups[attrName].map((av) => ({ value: av.id, label: av.value_name }))}
                                                                      placeholder={`Select ${attrName}`}
                                                                  />
                                                              </div>
                                                          ) : null
                                                      )
                                                    : null}
                                            </div>

                                            <div className="mt-4 space-y-3 border-t pt-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <h4 className="text-sm font-semibold text-foreground">Variant images</h4>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        aria-label={`Upload images for variant ${index + 1}`}
                                                        onChange={(e) => handleVariantImageUpload(index, e.target.files)}
                                                        className="sm:max-w-xs"
                                                    />
                                                </div>
                                                {variant.images && variant.images.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                        {variant.images.map((img, imgIndex) => {
                                                            const thumb = img.preview || (typeof img.image === 'string' ? img.image : '');
                                                            return (
                                                                <div key={img.id ?? `${imgIndex}-${thumb.slice(0, 12)}`} className="space-y-2 rounded-xl border p-2">
                                                                    {thumb ? <img src={thumb} alt="" className="h-24 w-full rounded-lg object-cover" loading="lazy" /> : null}
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            size="xs"
                                                                            variant={img.is_main ? 'default' : 'outline'}
                                                                            onClick={() => setVariantMainImage(index, imgIndex)}
                                                                        >
                                                                            {img.is_main ? 'Main' : 'Set main'}
                                                                        </Button>
                                                                        <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove image" onClick={() => removeVariantImage(index, imgIndex)}>
                                                                            <Trash2 className="text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                    <OptionSelect
                                                                        value={img.image_type}
                                                                        onChange={(v) => updateVariantImageType(index, imgIndex, v)}
                                                                        options={IMAGE_TYPES}
                                                                        placeholder="Image type"
                                                                        ariaLabel="Image type"
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">No images for this variant yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Images */}
                    <TabsContent value="images">
                        <Card>
                            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
                                {sectionHeader(
                                    'Product images',
                                    'Upload and manage product-level images (can optionally link to variants)',
                                    <Input type="file" accept="image/*" multiple aria-label="Upload product images" onChange={(e) => handleImageUpload(e.target.files)} className="sm:max-w-xs" />
                                )}

                                {images.length === 0 && variantGalleryRows.length === 0 ? (
                                    <EmptyState icon={ImageIcon} title="No images uploaded yet" description="Upload images to display them here. Variant-specific images can be added in the Variants tab." />
                                ) : null}

                                {variantGalleryRows.length > 0 ? (
                                    <div className="mb-6 space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-foreground">Saved images ({variantGalleryRows.length})</h3>
                                            <Button type="button" variant="link" size="sm" onClick={() => setActiveTab('variants')}>
                                                Edit in Variants tab
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Every image belongs to a variant, so existing images are managed in the Variants tab.</p>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                            {variantGalleryRows.map(({ src, key, label, isMain, imageType }) => (
                                                <div key={key} className="rounded-xl border p-2">
                                                    <img src={src} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" loading="lazy" />
                                                    <p className="truncate text-xs text-foreground" title={label}>
                                                        {label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{isMain ? 'Main' : imageType}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {images.map((image, index) => {
                                        const src = image.preview || (typeof image.image === 'string' ? image.image : '');
                                        return (
                                            <div key={image.id ?? `img-${index}`} className="space-y-3 rounded-2xl border p-3">
                                                {src ? <img src={src} alt="" className="h-40 w-full rounded-xl object-cover" loading="lazy" /> : null}
                                                <div className="flex items-center justify-between gap-2">
                                                    <Button type="button" size="sm" variant={image.is_main ? 'default' : 'outline'} onClick={() => setMainImage(index)}>
                                                        {image.is_main ? 'Main' : 'Set as main'}
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove image" onClick={() => removeImage(index)}>
                                                        <Trash2 className="text-destructive" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`img-${index}-variant`}>Product variant (optional)</Label>
                                                    <OptionSelect
                                                        id={`img-${index}-variant`}
                                                        value={image.product_variant || ''}
                                                        onChange={(v) => updateGalleryImage(index, { product_variant: v || undefined })}
                                                        options={variants.map((v, vIndex) => ({
                                                            value: v.sku,
                                                            label: `${v.sku}${v.attribute_values && v.attribute_values.length > 0 ? ` - Variant ${vIndex + 1}` : ''}`,
                                                        }))}
                                                        placeholder="None (requires variant SKU for upload)"
                                                        noneLabel="None (uses first variant SKU)"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`img-${index}-type`}>Image type</Label>
                                                    <OptionSelect id={`img-${index}-type`} value={image.image_type} onChange={(v) => updateGalleryImage(index, { image_type: v })} options={IMAGE_TYPES} placeholder="Image type" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Key features */}
                    <TabsContent value="features">
                        <Card>
                            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
                                {sectionHeader(
                                    'Key features',
                                    'Add key features that highlight the product',
                                    <Button type="button" size="sm" onClick={addKeyFeature}>
                                        <Plus />
                                        Add feature
                                    </Button>
                                )}
                                {keyFeatures.length === 0 ? (
                                    <EmptyState icon={Check} title="No key features yet" description="Add short highlights buyers should know about." />
                                ) : (
                                    <div className="space-y-3">
                                        {keyFeatures.map((feature, index) => (
                                            <div key={feature.id ?? index} className="flex items-center gap-2">
                                                <Input placeholder="Enter feature name" aria-label={`Feature ${index + 1}`} value={feature.name} onChange={(e) => updateKeyFeature(index, e.target.value)} />
                                                <Button type="button" variant="ghost" size="icon" aria-label={`Remove feature ${index + 1}`} onClick={() => removeKeyFeature(index)}>
                                                    <Trash2 className="text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tags */}
                    <TabsContent value="tags">
                        <Card>
                            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
                                {sectionHeader(
                                    'Tags',
                                    'Add tags to help customers find the product',
                                    <Button type="button" size="sm" onClick={addTag}>
                                        <Plus />
                                        Add tag
                                    </Button>
                                )}
                                {tags.length === 0 ? (
                                    <EmptyState icon={Tag} title="No tags yet" description="Tags are saved when the product is created." />
                                ) : (
                                    <div className="space-y-3">
                                        {tags.map((tag, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input placeholder="Enter tag name" aria-label={`Tag ${index + 1}`} value={tag.name} onChange={(e) => updateTag(index, e.target.value)} />
                                                <Button type="button" variant="ghost" size="icon" aria-label={`Remove tag ${index + 1}`} onClick={() => removeTag(index)}>
                                                    <Trash2 className="text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Sticky action bar */}
                <div className="sticky bottom-[4.25rem] z-40 flex items-center justify-end gap-2 border-t bg-background py-2.5 md:bottom-0">
                    <Button type="button" variant="outline" onClick={() => navigate('/admin/products/list')} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="animate-spin" />
                                {editProductId ? 'Saving...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <Check />
                                {editProductId ? 'Save changes' : 'Create product'}
                            </>
                        )}
                    </Button>
                </div>
            </form>

            <Dialog open={variantToRemove !== null} onOpenChange={(open) => (!open ? setVariantToRemove(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove variant</DialogTitle>
                        <DialogDescription>
                            {variantToRemove !== null ? `Remove variant ${variantToRemove + 1}${variants[variantToRemove]?.sku ? ` (${variants[variantToRemove].sku})` : ''}? ` : ''}
                            {editProductId ? 'Saved variants are deleted from the product when you save changes.' : 'It will not be created with the product.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setVariantToRemove(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                if (variantToRemove !== null) removeVariant(variantToRemove);
                                setVariantToRemove(null);
                            }}
                        >
                            <Trash2 />
                            Remove variant
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Form>
    );
};

export default AddProduct;
