import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// Define types
export interface RequestItem {
    id?: string;
    category: string;
    name: string;
    description?: string;
    quantity: number;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    fragile: boolean;
    needs_disassembly: boolean;
    special_instructions?: string;
    photos?: string[];
    declared_value?: number;
}

export interface JourneyStop {
    id?: string;
    type: 'pickup' | 'dropoff' | 'stop';
    location: {
        id?: string;
        address: string;
        unit_number?: string;
        coordinates?: [number, number];
    };
    floor: number;
    has_elevator: boolean;
    parking_info?: string;
    property_type?: string;
    number_of_rooms?: number;
    service_type?: string;
    instructions?: string;
    scheduled_time?: string;
    sequence: number;
    items?: RequestItem[];
    linked_items?: string[];
    needs_disassembly?: boolean;
    is_fragile?: boolean;
}

export interface ServiceRequest {
    id?: string;
    user_id?: string;
    request_type: 'biddable' | 'instant' | 'journey';
    status: string;
    priority: 'normal' | 'express' | 'same_day';
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    pickup_location?: any;
    dropoff_location?: any;
    preferred_pickup_date?: string;
    preferred_pickup_time?: string;
    preferred_delivery_date?: string;
    preferred_delivery_time?: string;
    is_flexible: boolean;
    items_description?: string;
    total_weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    requires_special_handling: boolean;
    special_instructions?: string;
    moving_items?: RequestItem[];
    photo_urls?: string[];
    base_price?: number;
    final_price?: number;
    insurance_required: boolean;
    insurance_value?: number;
    journey_stops?: JourneyStop[];
}

export interface ItemCategory {
    id: string;
    name: string;
    requires_special_handling: boolean;
    restricted: boolean;
    insurance_required: boolean;
    price_multiplier: number;
    special_instructions?: string;
    description?: string;
    icon?: string;
    image?: string;
    color?: string;
    tab_color?: string;
}

export interface CommonItem {
    id: string;
    name: string;
    category: string;
    description?: string;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    fragile: boolean;
    needs_disassembly: boolean;
    icon?: string;
    image?: string;
}

// Define the initial state type
interface ServiceRequestState {
    requests: ServiceRequest[];
    currentRequest: ServiceRequest | null;
    categories: ItemCategory[];
    commonItems: CommonItem[];
    loading: boolean;
    error: string | null;
}

// Define the initial state
const initialState: ServiceRequestState = {
    requests: [],
    currentRequest: null,
    categories: [],
    commonItems: [],
    loading: false,
    error: null,
};

// Create async thunks for API interactions
export const fetchServiceRequests = createAsyncThunk('serviceRequests/fetchAll', async (userId?: string) => {
    const response = await axiosInstance.get('/requests/', {
        params: { user_id: userId },
    });
    return response.data;
});

export const fetchServiceRequestById = createAsyncThunk('serviceRequests/fetchById', async ({ requestId, userId }: { requestId: string; userId: string }) => {
    const response = await axiosInstance.get(`/requests/${requestId}?user_id=${userId}`);
    return response.data;
});

export const createServiceRequest = createAsyncThunk('serviceRequests/create', async (request: ServiceRequest) => {
    const response = await axiosInstance.post('/requests/', request);
    return response.data;
});

export const updateServiceRequest = createAsyncThunk('serviceRequests/update', async ({ id, request }: { id: string; request: Partial<ServiceRequest> }) => {
    const response = await axiosInstance.patch(`/requests/${id}/`, request);
    return response.data;
});

export const submitServiceRequest = createAsyncThunk('serviceRequests/submit', async (id: string) => {
    const response = await axiosInstance.post(`/requests/${id}/submit/`);
    return response.data;
});

export const cancelServiceRequest = createAsyncThunk('serviceRequests/cancel', async ({ id, reason }: { id: string; reason: string }) => {
    const response = await axiosInstance.post(`/requests/${id}/cancel/`, { reason });
    return response.data;
});

export const fetchItemCategories = createAsyncThunk('serviceRequests/fetchCategories', async () => {
    const response = await axiosInstance.get('/item-categories/');
    return response.data;
});

export const fetchCommonItems = createAsyncThunk('serviceRequests/fetchCommonItems', async () => {
    const response = await axiosInstance.get('/common-items');
    return response.data;
});

export const fetchCategoriesWithItems = createAsyncThunk('serviceRequests/fetchCategoriesWithItems', async () => {
    const response = await axiosInstance.get('/common-items/categories-with-items');
    return response.data;
});

// Create the slice
const serviceRequestSlice = createSlice({
    name: 'serviceRequests',
    initialState,
    reducers: {
        setCurrentRequest: (state, action: PayloadAction<ServiceRequest | null>) => {
            state.currentRequest = action.payload;
        },
        updateCurrentRequest: (state, action: PayloadAction<Partial<ServiceRequest>>) => {
            if (state.currentRequest) {
                state.currentRequest = { ...state.currentRequest, ...action.payload };
            }
        },
        clearCurrentRequest: (state) => {
            state.currentRequest = null;
        },
        addJourneyStop: (state, action: PayloadAction<JourneyStop>) => {
            if (state.currentRequest) {
                const stops = state.currentRequest.journey_stops || [];
                state.currentRequest.journey_stops = [...stops, action.payload];
            }
        },
        updateJourneyStop: (state, action: PayloadAction<{ index: number; stop: JourneyStop }>) => {
            if (state.currentRequest?.journey_stops) {
                state.currentRequest.journey_stops[action.payload.index] = action.payload.stop;
            }
        },
        removeJourneyStop: (state, action: PayloadAction<number>) => {
            if (state.currentRequest?.journey_stops) {
                state.currentRequest.journey_stops = state.currentRequest.journey_stops.filter((_, index) => index !== action.payload);
            }
        },
        addRequestItem: (state, action: PayloadAction<RequestItem>) => {
            if (state.currentRequest) {
                const items = state.currentRequest.moving_items || [];
                state.currentRequest.moving_items = [...items, action.payload];
            }
        },
        updateRequestItem: (state, action: PayloadAction<{ index: number; item: RequestItem }>) => {
            if (state.currentRequest?.moving_items) {
                state.currentRequest.moving_items[action.payload.index] = action.payload.item;
            }
        },
        removeRequestItem: (state, action: PayloadAction<number>) => {
            if (state.currentRequest?.moving_items) {
                state.currentRequest.moving_items = state.currentRequest.moving_items.filter((_, index) => index !== action.payload);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch all requests
            .addCase(fetchServiceRequests.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchServiceRequests.fulfilled, (state, action) => {
                state.requests = action.payload;
                state.loading = false;
            })
            .addCase(fetchServiceRequests.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch requests';
            })
            // Fetch single request
            .addCase(fetchServiceRequestById.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchServiceRequestById.fulfilled, (state, action) => {
                state.currentRequest = action.payload;
                state.loading = false;
            })
            .addCase(fetchServiceRequestById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch request';
            })
            // Create request
            .addCase(createServiceRequest.pending, (state) => {
                state.loading = true;
            })
            .addCase(createServiceRequest.fulfilled, (state, action) => {
                state.requests.push(action.payload);
                state.currentRequest = action.payload;
                state.loading = false;
            })
            .addCase(createServiceRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create request';
            })
            // Update request
            .addCase(updateServiceRequest.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateServiceRequest.fulfilled, (state, action) => {
                const index = state.requests.findIndex((r) => r.id === action.payload.id);
                if (index !== -1) {
                    state.requests[index] = action.payload;
                }
                if (state.currentRequest?.id === action.payload.id) {
                    state.currentRequest = action.payload;
                }
                state.loading = false;
            })
            .addCase(updateServiceRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update request';
            })
            // Submit request
            .addCase(submitServiceRequest.pending, (state) => {
                state.loading = true;
            })
            .addCase(submitServiceRequest.fulfilled, (state, action) => {
                const index = state.requests.findIndex((r) => r.id === action.payload.id);
                if (index !== -1) {
                    state.requests[index] = action.payload;
                }
                if (state.currentRequest?.id === action.payload.id) {
                    state.currentRequest = action.payload;
                }
                state.loading = false;
            })
            .addCase(submitServiceRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to submit request';
            })
            // Cancel request
            .addCase(cancelServiceRequest.pending, (state) => {
                state.loading = true;
            })
            .addCase(cancelServiceRequest.fulfilled, (state, action) => {
                const index = state.requests.findIndex((r) => r.id === action.payload.id);
                if (index !== -1) {
                    state.requests[index] = action.payload;
                }
                if (state.currentRequest?.id === action.payload.id) {
                    state.currentRequest = action.payload;
                }
                state.loading = false;
            })
            .addCase(cancelServiceRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to cancel request';
            })
            // Fetch categories
            .addCase(fetchItemCategories.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchItemCategories.fulfilled, (state, action) => {
                state.categories = action.payload;
                state.loading = false;
            })
            .addCase(fetchItemCategories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch categories';
            })
            // Fetch common items
            .addCase(fetchCommonItems.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCommonItems.fulfilled, (state, action) => {
                state.commonItems = action.payload;
                state.loading = false;
            })
            .addCase(fetchCommonItems.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch common items';
            });
    },
});

// Export actions
export const { setCurrentRequest, updateCurrentRequest, clearCurrentRequest, addJourneyStop, updateJourneyStop, removeJourneyStop, addRequestItem, updateRequestItem, removeRequestItem } =
    serviceRequestSlice.actions;

// Export reducer
export default serviceRequestSlice.reducer;
