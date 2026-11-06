import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Checkout UI status only. Network calls live in `lib/checkoutApi.ts`; the previous
 * `/api/checkout/*` thunks pointed at routes that never existed and were removed.
 */
export type CheckoutStatus = 'idle' | 'processing' | 'success' | 'error'

interface CheckoutState {
    status: CheckoutStatus
    /** Last session created by POST checkout/ (or orders/<id>/pay/) in this tab. */
    checkoutId: string | null
}

const initialState: CheckoutState = {
    status: 'idle',
    checkoutId: null,
}

const checkoutSlice = createSlice({
    name: 'checkout',
    initialState,
    reducers: {
        setCheckoutStatus(state, action: PayloadAction<CheckoutStatus>) {
            state.status = action.payload
        },
        setCheckoutId(state, action: PayloadAction<string | null>) {
            state.checkoutId = action.payload
        },
        resetCheckout(state) {
            state.status = 'idle'
            state.checkoutId = null
        },
    },
})

export const { setCheckoutStatus, setCheckoutId, resetCheckout } = checkoutSlice.actions
export default checkoutSlice.reducer
