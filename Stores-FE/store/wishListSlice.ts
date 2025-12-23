import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AxiosResponse } from 'axios'
import axiosInstance from '@/lib/axiosInstance'
import { Wishlist } from '@/types'

export interface WishlistItem {
    productId: string
    quantity: number
    variantId?: string
}

interface WishlistState {
    wishlist: Wishlist
    isUpdating: boolean
}

const initialState: WishlistState = {
    wishlist: {
        id: '',
        created_at: '',
        updated_at: '',
        user: '',
        items: [],
        item_count: 0,
    },
    isUpdating: false,
}

export const getWishlist = createAsyncThunk('wishlist/getWishlist', async (_, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`users/1c110288-2c26-4837-b4b7-bbd4a29b3832/my_wishlist/`)
        return response.data as Wishlist
    } catch (error) {
        console.error('Failed to get wishlist:', error)
        return rejectWithValue(error)
    }
})

export const addToWishlist = createAsyncThunk(
    'wishlist/addToWishlist',
    async (
        payload: {
            wishlist_id: string
            product_id: string
        },
        { rejectWithValue, dispatch }
    ) => {
        try {
            const response = await axiosInstance.post(`wishlist-items/`, payload)
            if (response.status === 201) {
                dispatch(getWishlist())
            }
            return response
        } catch (error: any) {
            console.error('Failed to add to wishlist:', error)
            return rejectWithValue({
                message: error.message,
                code: error.code,
                response: error.response ? error.response.data : null,
            })
        }
    }
)

export const removeFromWishlist = createAsyncThunk('wishlist/removeFromWishlist', async (payload: { wishlistItemId: string }, { rejectWithValue, dispatch }) => {
    try {
        const response = await axiosInstance.delete(`/wishlist-items/${payload.wishlistItemId}/`)
        dispatch(getWishlist())
        return response
    } catch (error) {
        console.error('Failed to remove from wishlist:', error)
        return rejectWithValue(error)
    }
})

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getWishlist.pending, (state) => {
            state.isUpdating = true
        })
        builder.addCase(getWishlist.fulfilled, (state, action: PayloadAction<Wishlist>) => {
            state.wishlist = action.payload
            state.isUpdating = false
        })
        builder.addCase(getWishlist.rejected, (state) => {
            state.isUpdating = false
        })
        builder.addCase(addToWishlist.pending, (state) => {
            state.isUpdating = true
        })
        builder.addCase(addToWishlist.fulfilled, (state, action: PayloadAction<AxiosResponse>) => {
            state.wishlist = action.payload.data
            state.isUpdating = false
        })
        builder.addCase(addToWishlist.rejected, (state) => {
            state.isUpdating = false
        })
        builder.addCase(removeFromWishlist.pending, (state) => {
            state.isUpdating = true
        })
        builder.addCase(removeFromWishlist.fulfilled, (state, action: PayloadAction<AxiosResponse>) => {
            state.wishlist = action.payload.data
            state.isUpdating = false
        })
        builder.addCase(removeFromWishlist.rejected, (state) => {
            state.isUpdating = false
        })
    },
})

export default wishlistSlice.reducer