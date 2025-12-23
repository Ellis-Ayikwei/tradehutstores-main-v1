export interface Product {
    id?: string;
    tags?: string[];
    main_product_image?: {
        url: string;
    };
    created_at?: string;
    updated_at?: string;
    status?: string;
    name?: string;
    keywords?: string;
    description?: string;
    slug?: string;
    price?: string;
    min_amount?: number;
    thin?: string;
    inventory_level?: number;
    available?: boolean;
    condition?: string;
    is_spare_part?: boolean;
    requires_installation?: boolean;
    meta_title?: string;
    meta_description?: string;
    image?: string;
    average_rating?: string;
    total_reviews?: number;
    discount_price?: string;
    discount_percentage?: number;
    category?: string;
    sub_category?: string;
    brand?: string;
    seller?: string;
    variants?: {
        id?: string;
        name?: string;
    }[];
    rating?: number;
}

export interface ProductDetail {
    id: string;
    created_at: string;
    updated_at: string;
    status: string;
    name: string;
    keywords: string;
    description: string;
    slug: string;
    main_product_image: string;
    min_amount: number;
    thin: string;
    inventory_level: number;
    available: boolean;
    condition: string;
    variation_theme: string;
    is_spare_part: boolean;
    requires_installation: boolean;
    meta_title: string;
    meta_description: string;
    average_rating: string;
    total_reviews: number;
    discount_percentage: number;
    category: string;
    sub_category: string;
    brand: string;
    seller: {
        username: string;
        id: string;
    };
    default_variant: string;
    variants: Array<ProductVariant>;
    rating: number;
    reviews: Array<{
        product: string;
        user: {
            username: string;
            id: string;
        };
        rating: number;
        comment: string;
        id: string;
        created_at: string;
        updated_at: string;
    }>;
    key_features: Array<string>;
    price: string;
    final_price: number;
}

/******  0a96f865-dc92-462e-afb9-83e7bf14a1dd  *******/
export interface Cart {
    id: string;
    created_at: string;
    updated_at: string;
    user: string;
    items: Array<CartItem>;
    item_count: number;
}

export interface CartItem {
    product_id: string;
    item_id: string;
    available: boolean;
    average_rating: number;
    brand: string;
    category: string;
    condition: string;
    created_at: string;
    default_variant: string;
    description: string;
    discount_percentage: number;
    inventory_level: number;
    is_spare_part: boolean;
    keywords: string;
    main_product_image: {
        url: string;
    };
    meta_description: string;
    meta_title: string;
    min_amount: number;
    name: string;
    price: string;
    final_price: number;
    rating: number;
    quantity: number;
    requires_installation: boolean;
    selected_variant: ProductVariant;
    images: Array<unknown>;
    seller: string;
    slug: string;
    status: string;
    sub_category: string;
    tags: Array<string>;
    thin: string;
    total_reviews: number;
    updated_at: string;
    variation_theme: string;
    item_queantity: number;
}

export interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
}

export interface DashboardCard {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    trend?: number;
    className?: string;
}

export interface ProductVariant {
    id: string;
    sku: string;
    name: string;
    price: number;
    final_price: number;
    quantity: number;
    attribute_values: {
        id: string;
        attribute: {
            name: string;
            display_type: string;
        };
        value: string;
        color_code?: string;
    }[];
    images: unknown[];
    created_at: string;
    updated_at: string;
}

export interface AttributeValue {
    id: string;
    attribute: {
        name: string;
        display_type: string;
    };
    value: string;
    color_code?: string;
}

export interface Wishlist {
    id: string;
    created_at: string;
    updated_at: string;
    user: string;
    items: Array<WishListItem>;
    item_count: number;
}

export interface WishListItem extends CartItem {}
