import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axiosInstance from '@/lib/axiosInstance'
import { Wishlist } from '@/types'
import { wishlistItemProductId } from '@/lib/wishlistUtils'
import {
  addGuestWishlistProductId,
  clearGuestWishlistStorage,
  guestWishlistRowId,
  isGuestWishlistRowId,
  productIdFromGuestWishlistRowId,
  readGuestWishlistProductIds,
  removeGuestWishlistProductId,
} from '@/lib/guestWishlistStorage'

interface WishlistState {
  wishlist: Wishlist
  isUpdating: boolean
}

const emptyWishlist = (): Wishlist => ({
  id: '',
  created_at: '',
  updated_at: '',
  user: '',
  items: [],
  item_count: 0,
})

function buildGuestWishlistFromStorage(): Wishlist {
  const ids = readGuestWishlistProductIds()
  return {
    id: 'guest',
    created_at: '',
    updated_at: '',
    user: '',
    item_count: ids.length,
    items: ids.map((pid) => ({
      id: guestWishlistRowId(pid),
      product: pid,
      created_at: '',
    })),
  }
}

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('userId')
}

const hasAuthSession = (): boolean => {
  if (typeof window === 'undefined') return false
  const userId = getUserId()
  const authCookie = document.cookie.split(';').find((c) => c.trim().startsWith('_auth='))
  return Boolean(userId || authCookie)
}

const initialState: WishlistState = {
  wishlist: emptyWishlist(),
  isUpdating: false,
}

export const getWishlist = createAsyncThunk(
  'wishlist/getWishlist',
  async (_, { rejectWithValue }) => {
    if (!hasAuthSession()) {
      return buildGuestWishlistFromStorage()
    }
    try {
      const response = await axiosInstance.get<Wishlist[] | { results?: Wishlist[] }>(
        `wishlist/lists/`
      )
      const raw = response.data
      const list: Wishlist[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.results)
          ? raw.results
          : []
      if (!list.length) {
        return emptyWishlist()
      }
      return list[0] as Wishlist
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        return emptyWishlist()
      }
      console.error('Failed to get wishlist:', error)
      return rejectWithValue(error)
    }
  }
)

/** After login/signup: POST guest-stored product ids, then clear local storage. */
export const syncGuestWishlistToServer = createAsyncThunk(
  'wishlist/syncGuestWishlistToServer',
  async (_, { dispatch, rejectWithValue }) => {
    if (typeof window === 'undefined') return false
    if (!hasAuthSession()) return false
    const guestIds = readGuestWishlistProductIds()
    if (guestIds.length === 0) {
      await dispatch(getWishlist())
      return false
    }
    try {
      const response = await axiosInstance.get<Wishlist[] | { results?: Wishlist[] }>(
        `wishlist/lists/`
      )
      const raw = response.data
      const list: Wishlist[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.results)
          ? raw.results
          : []
      const wl = list[0]
      const serverIds = new Set(
        (wl?.items ?? []).map((row) => wishlistItemProductId(row as { product?: unknown }))
      )
      for (const pid of guestIds) {
        if (serverIds.has(pid)) continue
        try {
          await axiosInstance.post(`wishlist/items/`, { product: pid })
          serverIds.add(pid)
        } catch {
          /* duplicate or validation — continue */
        }
      }
      clearGuestWishlistStorage()
      await dispatch(getWishlist())
      return true
    } catch (error) {
      console.error('Guest wishlist sync failed:', error)
      return rejectWithValue(error)
    }
  }
)

/** Backend assigns wishlist in perform_create; body is `{ product: "<uuid>" }`. */
export const addToWishlist = createAsyncThunk(
  'wishlist/addToWishlist',
  async (payload: { product_id: string }, { rejectWithValue, dispatch }) => {
    if (!hasAuthSession()) {
      addGuestWishlistProductId(payload.product_id)
      await dispatch(getWishlist())
      return { guest: true as const }
    }
    try {
      const response = await axiosInstance.post(`wishlist/items/`, {
        product: payload.product_id,
      })
      await dispatch(getWishlist())
      return response
    } catch (error: unknown) {
      const err = error as {
        message?: string
        code?: string
        response?: { status?: number; data?: unknown }
      }
      console.error('Failed to add to wishlist:', error)
      return rejectWithValue({
        message: err.message,
        code: err.code,
        status: err.response?.status,
        response: err.response?.data ?? null,
      })
    }
  }
)

export const removeFromWishlist = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (payload: { wishlistItemId: string }, { rejectWithValue, dispatch }) => {
    if (isGuestWishlistRowId(payload.wishlistItemId)) {
      removeGuestWishlistProductId(productIdFromGuestWishlistRowId(payload.wishlistItemId))
      await dispatch(getWishlist())
      return true
    }
    try {
      await axiosInstance.delete(`wishlist/items/${payload.wishlistItemId}/`)
      await dispatch(getWishlist())
      return true
    } catch (error) {
      console.error('Failed to remove from wishlist:', error)
      return rejectWithValue(error)
    }
  }
)

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getWishlist.pending, (state) => {
        state.isUpdating = true
      })
      .addCase(getWishlist.fulfilled, (state, action: PayloadAction<Wishlist>) => {
        state.wishlist = action.payload
        state.isUpdating = false
      })
      .addCase(getWishlist.rejected, (state) => {
        state.isUpdating = false
      })
      .addCase(syncGuestWishlistToServer.pending, (state) => {
        state.isUpdating = true
      })
      .addCase(syncGuestWishlistToServer.fulfilled, (state) => {
        state.isUpdating = false
      })
      .addCase(syncGuestWishlistToServer.rejected, (state) => {
        state.isUpdating = false
      })
      .addCase(addToWishlist.pending, (state) => {
        state.isUpdating = true
      })
      .addCase(addToWishlist.fulfilled, (state) => {
        state.isUpdating = false
      })
      .addCase(addToWishlist.rejected, (state) => {
        state.isUpdating = false
      })
      .addCase(removeFromWishlist.pending, (state) => {
        state.isUpdating = true
      })
      .addCase(removeFromWishlist.fulfilled, (state) => {
        state.isUpdating = false
      })
      .addCase(removeFromWishlist.rejected, (state) => {
        state.isUpdating = false
      })
  },
})

export default wishlistSlice.reducer
