import { configureStore } from '@reduxjs/toolkit'
import productsSlice from './productSlice'
import themeConfigSlice from './themeConfigSlice'
import cartSlice from './cartSlice'
import wishListSlice from './wishListSlice'
import checkoutSlice from './checkoutSlice'

export const store = configureStore({
    reducer: {
        themeConfig: themeConfigSlice,
        products: productsSlice,
        cart: cartSlice,
        wishlist: wishListSlice,
        checkout: checkoutSlice,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredPaths: ['wishlist.addToWishlist.payload.headers'],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch