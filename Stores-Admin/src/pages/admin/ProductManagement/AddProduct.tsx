import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    IconArrowLeft,
    IconCheck,
    IconPlus,
    IconTrash,
    IconUpload,
    IconAlertCircle,
    IconPackage,
    IconTag,
} from '@tabler/icons-react';
// Mantine components removed - using Tailwind-based components instead
import { notifications } from '@mantine/notifications';
import axiosInstance from '../../../services/axiosInstance';
import IconLoader from '../../../components/Icon/IconLoader';

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

interface ProductVariant {
    id?: string;
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

const AddProduct: React.FC = () => {
    const navigate = useNavigate();
    const { id: editProductId } = useParams<{ id?: string }>();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('basic');

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

    const [formData, setFormData] = useState({
        // Basic Info
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
        main_product_image: null as File | null,
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
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [variants, setVariants] = useState<ProductVariant[]>([
        {
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
            notifications.show({
                title: 'Error',
                message: 'Failed to load dropdown data',
                color: 'red',
            });
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
            notifications.show({
                title: 'Warning',
                message: 'Could not load subcategories. Please try again.',
                color: 'yellow',
            });
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
            notifications.show({
                title: 'Warning',
                message: 'Could not load brands. Please try again.',
                color: 'yellow',
            });
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

            setFormData({
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
            notifications.show({
                title: 'Error',
                message: 'Could not load product for editing',
                color: 'red',
            });
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
            setFormData((prev) => ({ ...prev, sub_category: '' }));
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
            setFormData((prev) => ({ ...prev, brand: '' }));
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

    // Validation
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'Product name is required';
        }
        if (!formData.category) {
            errors.category = 'Category is required';
        }
        if (!formData.sub_category) {
            errors.sub_category = 'Sub category is required';
        }
        if (!formData.brand) {
            errors.brand = 'Brand is required';
        }
        if (!formData.variation_theme) {
            errors.variation_theme = 'Variation theme is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Form submission
    const handleSubmit = async () => {
        if (!validateForm()) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please fill in all required fields',
                color: 'red',
            });
            return;
        }

        if (variants.length === 0) {
            notifications.show({
                title: 'Validation Error',
                message: 'At least one product variant is required',
                color: 'red',
            });
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
            name: variant.name?.trim() || variant.sku,
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
                        notifications.show({
                            title: 'Image error',
                            message: 'Link gallery uploads to a variant SKU or add variants first.',
                            color: 'red',
                        });
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

                notifications.show({
                    title: 'Success',
                    message: 'Product created successfully',
                    color: 'green',
                    icon: <IconCheck />,
                });

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
                    notifications.show({
                        title: 'Image error',
                        message: 'Select a variant SKU for each new gallery upload.',
                        color: 'red',
                    });
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

            notifications.show({
                title: 'Success',
                message: 'Product updated',
                color: 'green',
                icon: <IconCheck />,
            });
            navigate(`/admin/products/${pid}`);
        } catch (error: unknown) {
            console.error('Save product failed', error);
            notifications.show({
                title: 'Error',
                message: apiErrorDetail(error),
                color: 'red',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData) {
        return <IconLoader />;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/products/list')}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Back to Products"
                    >
                        <IconArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {editProductId ? 'Edit Product' : 'Add New Product'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {editProductId
                                ? 'Update catalog fields, variants, gallery images, and key features'
                                : 'Create a new product in your catalog'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {editProductId && (
                        <button
                            type="button"
                            onClick={() => navigate(`/admin/products/${editProductId}`)}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            View detail
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
                <div className="flex border-b border-gray-200">
                    {[
                        { id: 'basic', label: 'Basic Information', icon: IconPackage },
                        { id: 'variants', label: 'Variants', icon: IconTag },
                        { id: 'images', label: 'Images', icon: IconUpload },
                        { id: 'features', label: 'Key Features', icon: IconCheck },
                        { id: 'tags', label: 'Tags', icon: IconTag },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600 bg-primary-50'
                                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Details</h2>
                            <p className="text-sm text-gray-600">Fill in the basic information about your product</p>
                        </div>
                        <div className="border-t border-gray-200 pt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter product name"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                            formErrors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {formErrors.name && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        {PRODUCT_STATUS.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                                    <input
                                        type="text"
                                        placeholder="Enter keywords (comma-separated)"
                                        value={formData.keywords}
                                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                                    <input
                                        type="text"
                                        placeholder="seo-friendly-slug"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Leave blank on create to auto-generate from brand + title on the backend.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                            formErrors.category ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.category && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sub Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        disabled={!formData.category || loading}
                                        value={formData.sub_category}
                                        onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                            formErrors.sub_category ? 'border-red-500' : 'border-gray-300'
                                        } ${!formData.category || loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">
                                            {!formData.category ? 'Select a category first' : loading ? 'Loading...' : 'Select a sub category'}
                                        </option>
                                        {subCategories.map((sc) => (
                                            <option key={sc.id} value={sc.id}>
                                                {sc.sub_category_name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.sub_category && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.sub_category}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Brand <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        disabled={!formData.category || loading}
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                            formErrors.brand ? 'border-red-500' : 'border-gray-300'
                                        } ${!formData.category || loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">
                                            {!formData.category ? 'Select a category first' : loading ? 'Loading...' : 'Select a brand'}
                                        </option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.brand && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                                    <select
                                        value={formData.condition}
                                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="">Select condition</option>
                                        {CONDITION_OPTIONS.map((cond) => (
                                            <option key={cond.value} value={cond.value}>
                                                {cond.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Variation Theme <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.variation_theme}
                                        onChange={(e) => setFormData({ ...formData, variation_theme: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                            formErrors.variation_theme ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    >
                                        {VARIATION_THEMES.map((theme) => (
                                            <option key={theme.value} value={theme.value}>
                                                {theme.label}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.variation_theme && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.variation_theme}</p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        placeholder="Enter product description"
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.min_amount}
                                        onChange={(e) => setFormData({ ...formData, min_amount: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Level</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.inventory_level}
                                        onChange={(e) => setFormData({ ...formData, inventory_level: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formData.discount_percentage}
                                        onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Seller</label>
                                    <select
                                        value={formData.seller_profile}
                                        onChange={(e) => setFormData({ ...formData, seller_profile: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="">Select a seller (optional)</option>
                                        {sellers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.business_name || s.user?.email || s.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Store (FK UUID)</label>
                                    <input
                                        type="text"
                                        placeholder="Optional store id"
                                        value={formData.store}
                                        onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                                        className="font-mono w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Product Image</label>
                                    {(heroBlobUrl || serverHeroUrl) && (
                                        <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                            <img
                                                src={(heroBlobUrl || serverHeroUrl) as string}
                                                alt="Hero preview"
                                                className="mx-auto max-h-48 w-auto object-contain"
                                            />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setHeroBlobUrl(file ? URL.createObjectURL(file) : null);
                                            setServerHeroUrl(null);
                                            setFormData({ ...formData, main_product_image: file });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                                    <input
                                        type="text"
                                        placeholder="SEO meta title"
                                        value={formData.meta_title}
                                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                                    <textarea
                                        placeholder="SEO meta description"
                                        rows={2}
                                        value={formData.meta_description}
                                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.available}
                                            onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                                            className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Available</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_spare_part}
                                            onChange={(e) => setFormData({ ...formData, is_spare_part: e.target.checked })}
                                            className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Is Spare Part</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requires_installation}
                                            onChange={(e) => setFormData({ ...formData, requires_installation: e.target.checked })}
                                            className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Requires Installation</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_product_of_the_month}
                                            onChange={(e) => setFormData({ ...formData, is_product_of_the_month: e.target.checked })}
                                            className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Product of the Month</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Variants Tab */}
                {activeTab === 'variants' && (
                    <div className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Variants</h2>
                                <p className="text-sm text-gray-600">Add product variants with different attributes</p>
                            </div>
                            <button
                                onClick={addVariant}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                            >
                                <IconPlus className="w-4 h-4" />
                                Add Variant
                            </button>
                        </div>
                        <div className="border-t border-gray-200 pt-6">
                            {variants.length === 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start gap-3">
                                    <IconAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p>At least one variant is required. Please add a variant.</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {variants.map((variant, index) => (
                                    <div
                                        key={variant.id ?? `${variant.sku || 'sku'}-${index}`}
                                        className="border border-gray-200 rounded-lg p-4"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">Variant {index + 1}</h3>
                                            {variants.length > 1 && (
                                                <button
                                                    onClick={() => removeVariant(index)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <IconTrash className="w-4 h-4 text-red-600" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    SKU <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter SKU"
                                                    required
                                                    value={variant.sku}
                                                    onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Price <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    required
                                                    value={variant.price}
                                                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={variant.quantity}
                                                    onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Buy Amount</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={variant.min_buy_amount}
                                                    onChange={(e) => updateVariant(index, 'min_buy_amount', parseInt(e.target.value) || 1)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                            </div>
                                            {formData.variation_theme !== 'single' && 
                                             Object.keys(attributeGroups).length > 0 && (() => {
                                                const attributeNames = formData.variation_theme.split('-');
                                                return (
                                                    <>
                                                        {/* First Attribute Group */}
                                                        {attributeNames.length > 0 && attributeGroups[attributeNames[0]] && (
                                                            <div className="col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                                    {attributeNames[0]} <span className="text-red-500">*</span>
                                                                </label>
                                                                <select
                                                                    value={Array.isArray(variant.attribute_values) && variant.attribute_values.length > 0 
                                                                        ? variant.attribute_values[0] 
                                                                        : ''}
                                                                    onChange={(e) => {
                                                                        const selected = e.target.value ? [e.target.value] : [];
                                                                        updateVariant(index, 'attribute_values', selected);
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                    required
                                                                >
                                                                    <option value="">Select {attributeNames[0]}</option>
                                                                    {attributeGroups[attributeNames[0]].map((av) => (
                                                                        <option key={av.id} value={av.id}>
                                                                            {av.value_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Second Attribute Group */}
                                                        {attributeNames.length > 1 && attributeGroups[attributeNames[1]] && (
                                                            <div className="col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                                    {attributeNames[1]} <span className="text-red-500">*</span>
                                                                </label>
                                                                <select
                                                                    value={variant.attribute_values1 || ''}
                                                                    onChange={(e) => {
                                                                        updateVariant(index, 'attribute_values1', e.target.value);
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                    required
                                                                >
                                                                    <option value="">Select {attributeNames[1]}</option>
                                                                    {attributeGroups[attributeNames[1]].map((av) => (
                                                                        <option key={av.id} value={av.id}>
                                                                            {av.value_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Third Attribute Group */}
                                                        {attributeNames.length > 2 && attributeGroups[attributeNames[2]] && (
                                                            <div className="col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                                    {attributeNames[2]} <span className="text-red-500">*</span>
                                                                </label>
                                                                <select
                                                                    value={variant.attribute_values2 || ''}
                                                                    onChange={(e) => {
                                                                        updateVariant(index, 'attribute_values2', e.target.value);
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                    required
                                                                >
                                                                    <option value="">Select {attributeNames[2]}</option>
                                                                    {attributeGroups[attributeNames[2]].map((av) => (
                                                                        <option key={av.id} value={av.id}>
                                                                            {av.value_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        
                                        {/* Variant-Specific Images */}
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold text-gray-700">Variant Images</h4>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => handleVariantImageUpload(index, e.target.files)}
                                                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                            </div>
                                            {variant.images && variant.images.length > 0 ? (
                                                <div className="grid grid-cols-4 gap-3">
                                                    {variant.images.map((img, imgIndex) => {
                                                        const thumb =
                                                            img.preview ||
                                                            (typeof img.image === 'string' ? img.image : '');
                                                        return (
                                                        <div
                                                            key={img.id ?? `${imgIndex}-${thumb.slice(0, 12)}`}
                                                            className="border border-gray-200 rounded-lg p-2"
                                                        >
                                                            {thumb ? (
                                                                <img
                                                                    src={thumb}
                                                                    alt=""
                                                                    className="w-full h-24 object-cover rounded mb-2"
                                                                />
                                                            ) : null}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <button
                                                                    onClick={() => setVariantMainImage(index, imgIndex)}
                                                                    className={`text-xs px-2 py-1 rounded ${
                                                                        img.is_main
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    {img.is_main ? 'Main' : 'Set Main'}
                                                                </button>
                                                                <button
                                                                    onClick={() => removeVariantImage(index, imgIndex)}
                                                                    className="p-1 hover:bg-red-50 rounded"
                                                                >
                                                                    <IconTrash className="w-3 h-3 text-red-600" />
                                                                </button>
                                                            </div>
                                                            <select
                                                                value={img.image_type}
                                                                onChange={(e) => {
                                                                    const updated = [...variants];
                                                                    if (updated[index].images) {
                                                                        updated[index].images![imgIndex].image_type = e.target.value;
                                                                        setVariants(updated);
                                                                    }
                                                                }}
                                                                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                                            >
                                                                {IMAGE_TYPES.map((type) => (
                                                                    <option key={type.value} value={type.value}>
                                                                        {type.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No images for this variant yet</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Images Tab */}
                {activeTab === 'images' && (
                    <div className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Images</h2>
                                <p className="text-sm text-gray-600">Upload and manage product-level images (can optionally link to variants)</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleImageUpload(e.target.files)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                        <div className="border-t border-gray-200 pt-6">
                            {images.length === 0 && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-start gap-3">
                                    <IconAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p>No images uploaded yet. Upload images to display them here. Note: Variant-specific images can be added in the Variants tab.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                {images.map((image, index) => {
                                    const src =
                                        image.preview ||
                                        (typeof image.image === 'string' ? image.image : '');
                                    return (
                                    <div key={image.id ?? `img-${index}`} className="border border-gray-200 rounded-lg p-4">
                                        {src ? (
                                            <img
                                                src={src}
                                                alt=""
                                                className="w-full h-40 object-cover rounded-lg mb-4"
                                            />
                                        ) : null}
                                        <div className="flex items-center justify-between mb-4">
                                            <button
                                                onClick={() => setMainImage(index)}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                                    image.is_main
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {image.is_main ? 'Main' : 'Set as Main'}
                                            </button>
                                            <button
                                                onClick={() => removeImage(index)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <IconTrash className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Variant (Optional)</label>
                                                <select
                                                    value={image.product_variant || ''}
                                                    onChange={(e) => {
                                                        const updated = [...images];
                                                        updated[index].product_variant = e.target.value || undefined;
                                                        setImages(updated);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                >
                                                    <option value="">None (requires variant SKU for upload)</option>
                                                    {variants.map((v, vIndex) => (
                                                        <option key={v.id || vIndex} value={v.sku}>
                                                            {v.sku}{' '}
                                                            {v.attribute_values && v.attribute_values.length > 0
                                                                ? `- Variant ${vIndex + 1}`
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Image Type</label>
                                                <select
                                                    value={image.image_type}
                                                    onChange={(e) => {
                                                        const updated = [...images];
                                                        updated[index].image_type = e.target.value;
                                                        setImages(updated);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                >
                                                    {IMAGE_TYPES.map((type) => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Key Features Tab */}
                {activeTab === 'features' && (
                    <div className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Key Features</h2>
                                <p className="text-sm text-gray-600">Add key features that highlight your product</p>
                            </div>
                            <button
                                onClick={addKeyFeature}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                            >
                                <IconPlus className="w-4 h-4" />
                                Add Feature
                            </button>
                        </div>
                        <div className="border-t border-gray-200 pt-6">
                            <div className="space-y-3">
                                {keyFeatures.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="Enter feature name"
                                            value={feature.name}
                                            onChange={(e) => updateKeyFeature(index, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                        <button
                                            onClick={() => removeKeyFeature(index)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tags Tab */}
                {activeTab === 'tags' && (
                    <div className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Tags</h2>
                                <p className="text-sm text-gray-600">Add tags to help customers find your product</p>
                            </div>
                            <button
                                onClick={addTag}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                            >
                                <IconPlus className="w-4 h-4" />
                                Add Tag
                            </button>
                        </div>
                        <div className="border-t border-gray-200 pt-6">
                            <div className="space-y-3">
                                {tags.map((tag, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="Enter tag name"
                                            value={tag.name}
                                            onChange={(e) => updateTag(index, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                        <button
                                            onClick={() => removeTag(index)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-4">
                <button
                    onClick={() => navigate('/admin/products/list')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {editProductId ? 'Saving...' : 'Creating...'}
                        </>
                    ) : (
                        <>
                            <IconCheck className="w-4 h-4" />
                            {editProductId ? 'Save changes' : 'Create product'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AddProduct;
