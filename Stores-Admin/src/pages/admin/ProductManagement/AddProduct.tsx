import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconArrowLeft,
    IconCheck,
    IconPlus,
    IconTrash,
    IconUpload,
    IconX,
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

interface Tag {
    id?: string;
    name: string;
}

const AddProduct: React.FC = () => {
    const navigate = useNavigate();
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
    const [formData, setFormData] = useState({
        // Basic Info
        status: 'Draft',
        name: '',
        keywords: '',
        description: '',
        category: '',
        sub_category: '',
        brand: '',
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

    // Fetch dropdown data
    useEffect(() => {
        fetchDropdownData();
    }, []);

    // Fetch subcategories when category changes
    useEffect(() => {
        if (formData.category) {
            fetchSubCategories(formData.category);
        } else {
            setSubCategories([]);
            setFormData(prev => ({ ...prev, sub_category: '' }));
        }
    }, [formData.category]);

    // Fetch brands when category changes
    useEffect(() => {
        if (formData.category) {
            fetchBrands(formData.category);
        } else {
            setBrands([]);
            setFormData(prev => ({ ...prev, brand: '' }));
        }
    }, [formData.category]);

    // Fetch attribute values when variation theme changes
    useEffect(() => {
        if (formData.variation_theme && formData.variation_theme !== 'single') {
            fetchAttributeValuesForTheme(formData.variation_theme);
        } else {
            setAttributeValues([]);
            setAttributeGroups({});
        }
    }, [formData.variation_theme]);

    const fetchDropdownData = async () => {
        try {
            setLoadingData(true);
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
            const sellersData = Array.isArray(sellersRes.data)
                ? sellersRes.data
                : sellersRes.data?.results || [];

            setCategories(categoriesData);
            setAttributes(attributesData);
            setSellers(sellersData);
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

    const fetchSubCategories = async (categoryId: string) => {
        try {
            setLoading(true);
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
            setLoading(false);
        }
    };

    const fetchBrands = async (categoryId: string) => {
        try {
            setLoading(true);
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
            setLoading(false);
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

        setSubmitting(true);
        try {
            // Create FormData for multipart/form-data
            const submitFormData = new FormData();

            // Add basic product fields
            Object.keys(formData).forEach((key) => {
                const value = formData[key as keyof typeof formData];
                if (key === 'main_product_image' && value instanceof File) {
                    submitFormData.append('main_product_image', value);
                } else if (key !== 'main_product_image' && value !== null && value !== undefined) {
                    submitFormData.append(key, String(value));
                }
            });

            // Create product
            const productResponse = await axiosInstance.post('/products/', submitFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const productId = productResponse.data.id;

            // Create variants and store variant IDs for image linking
            const variantIdMap: Record<string, string> = {}; // Maps SKU to variant ID
            
            for (let i = 0; i < variants.length; i++) {
                const variant = variants[i];
                // Combine attribute group selections into single array (matching Django admin behavior)
                const combinedAttributeValues: string[] = [];
                
                // Add first attribute value (from attribute_values array or first element)
                if (variant.attribute_values && variant.attribute_values.length > 0) {
                    combinedAttributeValues.push(variant.attribute_values[0]);
                }
                
                // Add second attribute value (from attribute_values1)
                if (variant.attribute_values1) {
                    combinedAttributeValues.push(variant.attribute_values1);
                }
                
                // Add third attribute value (from attribute_values2)
                if (variant.attribute_values2) {
                    combinedAttributeValues.push(variant.attribute_values2);
                }
                
                const variantData = {
                    product: productId,
                    sku: variant.sku,
                    price: variant.price,
                    quantity: variant.quantity,
                    min_buy_amount: variant.min_buy_amount,
                    attribute_values: combinedAttributeValues,
                };
                const variantResponse = await axiosInstance.post('/variants/', variantData);
                const variantId = variantResponse.data.id;
                variantIdMap[variant.sku] = variantId;
                
                // Upload variant-specific images
                if (variant.images && variant.images.length > 0) {
                    for (const image of variant.images) {
                        if (image.image instanceof File) {
                            const imageFormData = new FormData();
                            imageFormData.append('product', productId);
                            imageFormData.append('product_variant', variantId);
                            imageFormData.append('image', image.image);
                            imageFormData.append('is_main', String(image.is_main));
                            imageFormData.append('image_type', image.image_type);
                            await axiosInstance.post('/product-images/', imageFormData, {
                                headers: {
                                    'Content-Type': 'multipart/form-data',
                                },
                            });
                        }
                    }
                }
            }

            // Upload product-level images (can optionally link to variants)
            for (const image of images) {
                if (image.image instanceof File) {
                    const imageFormData = new FormData();
                    imageFormData.append('product', productId);
                    imageFormData.append('image', image.image);
                    imageFormData.append('is_main', String(image.is_main));
                    imageFormData.append('image_type', image.image_type);
                    // If product_variant is set (by SKU), look up the variant ID
                    if (image.product_variant && variantIdMap[image.product_variant]) {
                        imageFormData.append('product_variant', variantIdMap[image.product_variant]);
                    }
                    await axiosInstance.post('/product-images/', imageFormData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                }
            }

            // Create key features
            for (const feature of keyFeatures) {
                if (feature.name.trim()) {
                    await axiosInstance.post('/key-features/', {
                        product: productId,
                        name: feature.name,
                    });
                }
            }

            // Create tags - tags might be created via product endpoint or separate endpoint
            for (const tag of tags) {
                if (tag.name.trim()) {
                    try {
                        // Try tags endpoint first
                        await axiosInstance.post('/tags/', {
                            product: productId,
                            name: tag.name,
                        });
                    } catch (tagError) {
                        // If tags endpoint doesn't exist, try product tags endpoint
                        try {
                            await axiosInstance.post(`/products/${productId}/tags/`, {
                                name: tag.name,
                            });
                        } catch (e) {
                            console.warn('Could not create tag:', tag.name, e);
                            // Continue without failing the entire operation
                        }
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
        } catch (error: any) {
            console.error('Error creating product:', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to create product',
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
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/products/list')}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Back to Products"
                    >
                        <IconArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
                        <p className="text-gray-600 mt-1">Create a new product in your catalog</p>
                    </div>
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
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Product Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
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
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
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
                                                    {variant.images.map((img, imgIndex) => (
                                                        <div key={imgIndex} className="border border-gray-200 rounded-lg p-2">
                                                            {img.preview && (
                                                                <img
                                                                    src={img.preview}
                                                                    alt={`Variant ${index + 1} image ${imgIndex + 1}`}
                                                                    className="w-full h-24 object-cover rounded mb-2"
                                                                />
                                                            )}
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
                                                    ))}
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
                                {images.map((image, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        {image.preview && (
                                            <img
                                                src={image.preview}
                                                alt={`Product image ${index + 1}`}
                                                className="w-full h-40 object-cover rounded-lg mb-4"
                                            />
                                        )}
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
                                                    <option value="">None (Product-level image)</option>
                                                    {variants.map((v, vIndex) => (
                                                        <option key={vIndex} value={v.sku}>
                                                            {v.sku} {v.attribute_values && v.attribute_values.length > 0 ? `- Variant ${vIndex + 1}` : ''}
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
                                ))}
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
                            Creating...
                        </>
                    ) : (
                        <>
                            <IconCheck className="w-4 h-4" />
                            Create Product
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AddProduct;
