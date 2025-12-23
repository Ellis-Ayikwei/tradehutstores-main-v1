import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axiosInstance from '@/lib/axiosInstance'
import { ProductDetail } from '@/types'

const initialProductDetailState: ProductDetail = {
    id: '',
    created_at: '',
    updated_at: '',
    status: '',
    name: '',
    keywords: '',
    description: '',
    slug: '',
    price: '',
    final_price: 0,
    main_product_image: '',
    min_amount: 0,
    thin: '',
    inventory_level: 0,
    available: false,
    condition: '',
    is_spare_part: false,
    requires_installation: false,
    meta_title: '',
    meta_description: '',
    average_rating: '',
    total_reviews: 0,
    discount_percentage: 0,
    category: '',
    sub_category: '',
    brand: '',
    seller: {
        username: '',
        id: '',
    },
    variants: [],
    rating: 0,
    reviews: [],
    key_features: [],
    variation_theme: '',
    default_variant: '',
}

interface ProductState {
    allProducts: object[]
    featuredProducts: object[]
    popularProducts: object[]
    newArrivals: object[]
    discountedProducts: object[]
    trendingProducts: object[]
    bestSellers: object[]
    recommendedProducts: object[]
    relatedProducts: object[]
    productDetail: ProductDetail
    searchResults: object[]
    productOfTheMonth: object[]
    isUpdating: boolean
    error: string | null
}

const initialState: ProductState = {
    allProducts: [],
    featuredProducts: [],
    popularProducts: [],
    newArrivals: [],
    discountedProducts: [],
    productOfTheMonth: [],
    trendingProducts: [],
    bestSellers: [],
    recommendedProducts: [],
    relatedProducts: [],
    productDetail: initialProductDetailState,
    searchResults: [],
    isUpdating: false,
    error: null,
}

export const fetchNewArrivals = createAsyncThunk('products/fetchNewArrivals', async () => {
    const response = await axiosInstance.get('/products/new_arrivals/')
    return response.data
})

export const fetchPOM = createAsyncThunk('products/fetchProductOfTheMonth', async () => {
    const response = await axiosInstance.get('/products/product_of_the_month/')
    return response.data
})

export const fetchDiscountedProducts = createAsyncThunk('products/fetchDiscounted', async () => {
    const response = await axiosInstance.get('/products/discounted/')
    return response.data
})

export const fetchTrendingProducts = createAsyncThunk('products/fetchTrending', async () => {
    const response = await axiosInstance.get('/products/trending/')
    return response.data
})

export const fetchBestSellers = createAsyncThunk('products/fetchBestSellers', async () => {
    const response = await axiosInstance.get('/products/best_sellers/')
    return response.data
})

export const fetchRecommendedProducts = createAsyncThunk('products/fetchRecommended', async (product_id: string) => {
    const response = await axiosInstance.get(`/products/${product_id}/recommended/`)
    return response.data
})

export const fetchRelatedProducts = createAsyncThunk('products/fetchRelated', async (product_id: string) => {
    const response = await axiosInstance.get(`/products/${product_id}/related/`)
    return response.data
})

export const fetchProducts = createAsyncThunk('products/fetchAll', async () => {
    const response = await axiosInstance.get('/products/')
    return response.data
})

export const fetchAProduct = createAsyncThunk('products/fetchOne', async (product_id: string) => {
    const response = await axiosInstance.get(`/products/${product_id}/`)
    return response.data
})

export const fetchFeaturedProducts = createAsyncThunk('products/featured', async () => {
    const response = await axiosInstance.get('/products/featured/')
    return response.data
})

export const fetchPopularProducts = createAsyncThunk('products/popular', async () => {
    const response = await axiosInstance.get('/products/popular/')
    return response.data
})

export const fetchTopRatedProducts = createAsyncThunk('products/toprated', async () => {
    const response = await axiosInstance.get('/products/top_rated/')
    return response.data
})

export const searchProducts = createAsyncThunk('products/search', async (query: string) => {
    const response = await axiosInstance.get(`/products/search/?q=${query}`)
    return response.data
})

const productSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.isUpdating = true
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.allProducts = action.payload
                state.isUpdating = false
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.isUpdating = false
                state.error = action.error.message || 'An error occurred'
            })
            .addCase(fetchAProduct.pending, (state) => {
                state.isUpdating = true
            })
            .addCase(fetchAProduct.fulfilled, (state, action) => {
                state.productDetail = action.payload
                state.isUpdating = true
            })
            .addCase(fetchAProduct.rejected, (state, action) => {
                state.isUpdating = true
            })
            .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
                state.featuredProducts = action.payload
            })
            .addCase(fetchPopularProducts.fulfilled, (state, action) => {
                state.popularProducts = action.payload
            })
            .addCase(searchProducts.fulfilled, (state, action) => {
                state.allProducts = action.payload
            })
            .addCase(fetchPOM.fulfilled, (state, action) => {
                state.productOfTheMonth = action.payload
            })
    },
})

export default productSlice.reducer