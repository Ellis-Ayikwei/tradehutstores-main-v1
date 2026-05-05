import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AxiosResponse } from 'axios'
import axiosInstance from '@/lib/axiosInstance'
import { Cart, CartItem } from '@/types'

interface LocalCartItem {
    id: string
    product_id: string
    product_variant_id?: string
    quantity: number
    product: {
        id: string
        name: string
        price: string
        final_price: number
        main_product_image?: string | { url: string }
        image?: string
        brand?: string
        category?: string
    }
    variant?: {
        id: string
        name: string
        price: string | number
    }
}

interface CartState {
    cart: Cart
    isUpdating: boolean
    isGuest: boolean
    userId?: string
    lastAction?: {
        type: 'added' | 'updated' | 'removed'
        message: string
        itemAlreadyExists?: boolean
    }
}

// Load cart from localStorage
const loadCartFromStorage = (): Cart => {
    if (typeof window === 'undefined') {
        return {
            id: 'guest-cart',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user: '',
            items: [],
            item_count: 0,
        }
    }
    
    try {
        const stored = localStorage.getItem('guest_cart')
        if (stored) {
            const parsed = JSON.parse(stored)
            return {
                ...parsed,
                item_count: parsed.items?.reduce((sum: number, item: LocalCartItem) => sum + item.quantity, 0) || 0
            }
        }
    } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
    }
    
    return {
        id: 'guest-cart',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: '',
        items: [],
        item_count: 0,
    }
}

// Save cart to localStorage
const saveCartToStorage = (cart: Cart) => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('guest_cart', JSON.stringify(cart))
        } catch (error) {
            console.error('Failed to save cart to localStorage:', error)
        }
    }
}

// Helper to get user ID from localStorage or auth
const getUserId = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('userId')
}

// Helper to check if user is authenticated
const checkIsGuest = (): boolean => {
    if (typeof window === 'undefined') return true
    const userId = getUserId()
    const authCookie = document.cookie.split(';').find(c => c.trim().startsWith('_auth='))
    return !userId && !authCookie
}

const initialState: CartState = {
    cart: loadCartFromStorage(),
    isUpdating: false,
    isGuest: checkIsGuest(),
    userId: getUserId() || undefined,
    lastAction: undefined,
}

export const getCart = createAsyncThunk('cart/getCart', async (_, { rejectWithValue, getState }) => {
    const state = getState() as { cart: CartState }
    const userId = state.cart.userId || getUserId()
    
    if (!userId || state.cart.isGuest) {
        // Return guest cart from localStorage
        return loadCartFromStorage()
    }
    
    try {
        const response = await axiosInstance.get(`users/${userId}/my_cart/`)
        return response.data as Cart
    } catch (error) {
        console.error('Failed to get cart:', error)
        // Fallback to guest cart on error
        return loadCartFromStorage()
    }
})

export const addToCart = createAsyncThunk(
    'cart/addToCart',
    async (
        payload: {
            cart_id?: string
            product_id: string
            quantity: number
            product_variant_id?: string
            product?: any
            variant?: any
        },
        { rejectWithValue, dispatch, getState }
    ) => {
        const state = getState() as { cart: CartState }
        
        // If guest user, use local storage
        if (state.cart.isGuest || !payload.cart_id) {
            // Dispatch the local action and wait for it to complete
            await dispatch(addToCartLocal({
                product_id: payload.product_id,
                quantity: payload.quantity,
                product_variant_id: payload.product_variant_id,
                product: payload.product,
                variant: payload.variant,
            }))
            
            // Get updated state after local action
            const updatedState = getState() as { cart: CartState }
            return { status: 201, data: updatedState.cart.cart }
        }

        // Otherwise, use API
        try {
            const cartId = payload.cart_id || state.cart.cart.id
            if (!cartId || cartId === 'guest-cart') {
                // Fallback to local if no valid cart ID
                await dispatch(addToCartLocal({
                    product_id: payload.product_id,
                    quantity: payload.quantity,
                    product_variant_id: payload.product_variant_id,
                    product: payload.product,
                    variant: payload.variant,
                }))
                const updatedState = getState() as { cart: CartState }
                return { status: 201, data: updatedState.cart.cart }
            }
            
            const response = await axiosInstance.post(`cart-items/`, {
                cart_id: cartId,
                product_id: payload.product_id,
                quantity: payload.quantity,
                product_variant_id: payload.product_variant_id,
            })
            if (response.status === 201 || response.status === 200) {
                await dispatch(getCart())
            }
            return response
        } catch (error: any) {
            console.error('Failed to add to cart:', error)
            // Fallback to local storage on API error
            if (error.response?.status !== 401) {
                await dispatch(addToCartLocal({
                    product_id: payload.product_id,
                    quantity: payload.quantity,
                    product_variant_id: payload.product_variant_id,
                    product: payload.product,
                    variant: payload.variant,
                }))
                const updatedState = getState() as { cart: CartState }
                return { status: 201, data: updatedState.cart.cart }
            }
            return rejectWithValue({
                message: error.message,
                code: error.code,
                response: error.response ? error.response.data : null,
            })
        }
    }
)

export const removeFromCart = createAsyncThunk('cart/removeFromCart', async (payload: { cartItemId: string }, { rejectWithValue, dispatch, getState }) => {
    const state = getState() as { cart: CartState }
    
    // If guest user, use local storage
    if (state.cart.isGuest) {
        await dispatch(removeFromCartLocal({ itemId: payload.cartItemId }))
        const updatedState = getState() as { cart: CartState }
        return { status: 200, data: updatedState.cart.cart }
    }
    
    // Otherwise, use API
    try {
        const response = await axiosInstance.delete(`/cart-items/${payload.cartItemId}/`)
        if (response.status === 200 || response.status === 204) {
            await dispatch(getCart())
        }
        return response
    } catch (error: any) {
        console.error('Failed to remove from cart:', error)
        // Fallback to local storage on API error (if not auth error)
        if (error.response?.status !== 401) {
            await dispatch(removeFromCartLocal({ itemId: payload.cartItemId }))
            const updatedState = getState() as { cart: CartState }
            return { status: 200, data: updatedState.cart.cart }
        }
        return rejectWithValue(error)
    }
})

export const updateCart = createAsyncThunk('cart/updateCart', async (payload: { cartItemId: string; quantity: number }, { rejectWithValue, dispatch, getState }) => {
    const state = getState() as { cart: CartState }
    
    // If guest user, use local storage
    if (state.cart.isGuest) {
        dispatch(updateCartItemQuantityLocal({ itemId: payload.cartItemId, quantity: payload.quantity }))
        return { status: 200, data: state.cart.cart }
    }
    
    // Otherwise, use API
    try {
        const response = await axiosInstance.put(`/cart-items/${payload.cartItemId}/update_item_quantity/`, payload)
        if (response.status === 200) {
            dispatch(getCart())
        }
        return response
    } catch (error) {
        console.error('Failed to update cart:', error)
        return rejectWithValue(error)
    }
})

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        // Local guest cart actions
        addToCartLocal: (state, action: PayloadAction<{
            product_id: string
            quantity: number
            product_variant_id?: string
            product: any
            variant?: any
        }>) => {
            const { product_id, quantity, product_variant_id, product, variant } = action.payload
            console.log("adding to local state")
            
            // Check if item already exists (same product and variant)
            const existingItemIndex = state.cart.items.findIndex(
                (item: any) => 
                    item.product_id === product_id && 
                    item.product_variant_id === product_variant_id
            )
            
            if (existingItemIndex >= 0) {
                // Update quantity if item exists
                const existingItem = state.cart.items[existingItemIndex] as any
                existingItem.quantity += quantity
            } else {
                // Add new item
                const newItem: LocalCartItem = {
                    id: `item-${Date.now()}-${Math.random()}`,
                    product_id,
                    product_variant_id,
                    quantity,
                    product: {
                        id: product.id || product_id,
                        name: product.name,
                        price: String(variant?.price ?? product.price ?? product.final_price ?? '0'),
                        final_price: Number(product.final_price ?? product.price ?? 0) || 0,
                        main_product_image: product.main_product_image || product.image,
                        image: product.image || product.main_product_image,
                        brand: product.brand,
                        category: product.category,
                    },
                    variant: variant ? {
                        id: variant.id,
                        name: variant.name,
                        price: variant.price,
                    } : undefined,
                }
                state.cart.items.push(newItem as any)
            }
            
            // Update item count and timestamps
            state.cart.item_count = state.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
            state.cart.updated_at = new Date().toISOString()
            
            // Save to localStorage
            saveCartToStorage(state.cart)
        },
        
        removeFromCartLocal: (state, action: PayloadAction<{ itemId: string }>) => {
            state.cart.items = state.cart.items.filter((item: any) => item.id !== action.payload.itemId)
            state.cart.item_count = state.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
            state.cart.updated_at = new Date().toISOString()
            saveCartToStorage(state.cart)
        },
        
        updateCartItemQuantityLocal: (state, action: PayloadAction<{ itemId: string; quantity: number }>) => {
            const item = state.cart.items.find((item: any) => item.id === action.payload.itemId)
            if (item) {
                (item as any).quantity = Math.max(1, action.payload.quantity)
                state.cart.item_count = state.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
                state.cart.updated_at = new Date().toISOString()
                saveCartToStorage(state.cart)
            }
        },
        
        clearCartLocal: (state) => {
            state.cart.items = []
            state.cart.item_count = 0
            state.cart.updated_at = new Date().toISOString()
            saveCartToStorage(state.cart)
        },
        
        initializeCartFromStorage: (state) => {
            state.cart = loadCartFromStorage()
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getCart.pending, (state) => {
            state.isUpdating = true
        })
        builder.addCase(getCart.fulfilled, (state, action: PayloadAction<Cart>) => {
            state.cart = action.payload
            state.isUpdating = false
        })
        builder.addCase(getCart.rejected, (state) => {
            state.isUpdating = false
        })
        builder.addCase(addToCart.pending, (state) => {
            state.isUpdating = true
        })
        builder.addCase(addToCart.fulfilled, (state, action) => {
            // Handle both API response and local cart response
            if ('data' in action.payload && typeof action.payload.data === 'object' && 'items' in action.payload.data) {
                state.cart = action.payload.data as Cart
            } else if ('status' in action.payload && action.payload.status === 201) {
                // Local cart was updated, cart is already updated by the reducer
                // Just ensure item_count is calculated
                state.cart.item_count = state.cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
            }
            state.isUpdating = false
        })
        builder.addCase(addToCart.rejected, (state) => {
            state.isUpdating = false
        })
    },
})

export const { 
    addToCartLocal, 
    removeFromCartLocal, 
    updateCartItemQuantityLocal, 
    clearCartLocal,
    initializeCartFromStorage 
} = cartSlice.actions

export default cartSlice.reducer