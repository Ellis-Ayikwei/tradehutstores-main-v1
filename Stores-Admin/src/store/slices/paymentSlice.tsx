import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// Define types
export interface PaymentMethod {
    id?: string;
    user_id: string;
    payment_type: 'card' | 'bank' | 'wallet';
    is_default: boolean;
    last_used?: string;
    is_active: boolean;
    card_last_four?: string;
    card_brand?: string;
    card_expiry?: string;
    bank_name?: string;
    account_last_four?: string;
}

export interface Payment {
    id?: string;
    request_id: string;
    payment_method_id?: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    transaction_id: string;
    completed_at?: string;
    refund_reason?: string;
}

interface PaymentState {
    paymentMethods: PaymentMethod[];
    payments: Payment[];
    loading: boolean;
    error: string | null;
}

const initialState: PaymentState = {
    paymentMethods: [],
    payments: [],
    loading: false,
    error: null,
};

// Create async thunks for API interactions
export const fetchPaymentMethods = createAsyncThunk('payments/fetchMethods', async (userId?: string) => {
    const response = await axiosInstance.get('/api/payment-methods/', {
        params: { user: userId },
    });
    return response.data;
});

export const addPaymentMethod = createAsyncThunk('payments/addMethod', async (method: Partial<PaymentMethod>) => {
    const response = await axiosInstance.post('/api/payment-methods/', method);
    return response.data;
});

export const setDefaultPaymentMethod = createAsyncThunk('payments/setDefault', async (methodId: string) => {
    const response = await axiosInstance.post(`/api/payment-methods/${methodId}/set_as_default/`);
    return response.data;
});

export const fetchPayments = createAsyncThunk('payments/fetchAll', async (requestId?: string) => {
    const response = await axiosInstance.get('/api/payments/', {
        params: { request: requestId },
    });
    return response.data;
});

export const createPayment = createAsyncThunk('payments/create', async (payment: Partial<Payment>) => {
    const response = await axiosInstance.post('/api/payments/', payment);
    return response.data;
});

// Create the slice
const paymentSlice = createSlice({
    name: 'payments',
    initialState,
    reducers: {
        clearPaymentMethods: (state) => {
            state.paymentMethods = [];
        },
        clearPayments: (state) => {
            state.payments = [];
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch payment methods
            .addCase(fetchPaymentMethods.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
                state.paymentMethods = action.payload;
                state.loading = false;
            })
            .addCase(fetchPaymentMethods.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch payment methods';
            })
            // Add payment method
            .addCase(addPaymentMethod.pending, (state) => {
                state.loading = true;
            })
            .addCase(addPaymentMethod.fulfilled, (state, action) => {
                state.paymentMethods.push(action.payload);
                state.loading = false;
            })
            .addCase(addPaymentMethod.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to add payment method';
            })
            // Set default payment method
            .addCase(setDefaultPaymentMethod.pending, (state) => {
                state.loading = true;
            })
            .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
                state.paymentMethods = state.paymentMethods.map((method) => ({
                    ...method,
                    is_default: method.id === action.payload.id,
                }));
                state.loading = false;
            })
            .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to set default payment method';
            })
            // Fetch payments
            .addCase(fetchPayments.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPayments.fulfilled, (state, action) => {
                state.payments = action.payload;
                state.loading = false;
            })
            .addCase(fetchPayments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch payments';
            })
            // Create payment
            .addCase(createPayment.pending, (state) => {
                state.loading = true;
            })
            .addCase(createPayment.fulfilled, (state, action) => {
                state.payments.push(action.payload);
                state.loading = false;
            })
            .addCase(createPayment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create payment';
            });
    },
});

export const { clearPaymentMethods, clearPayments } = paymentSlice.actions;
export default paymentSlice.reducer;
