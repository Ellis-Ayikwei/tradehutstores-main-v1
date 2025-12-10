// src/store/slices/serviceRequestSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { addDraft, updateDraft } from './draftRequestsSlice';
import axiosInstance from '../../services/axiosInstance';

// Persist a single active request locally so users don't create many requests accidentally
const ACTIVE_REQUEST_STORAGE_KEY = 'activeServiceRequest';

function loadActiveRequestFromStorage(): { formValues?: Partial<RequestForm>; request_id?: string } {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(ACTIVE_REQUEST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveActiveRequestToStorage(formValues: RequestForm, request_id: string | null) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(
            ACTIVE_REQUEST_STORAGE_KEY,
            JSON.stringify({ formValues, request_id: request_id ?? undefined })
        );
    } catch {
        // ignore
    }
}

// Local form type kept here to avoid drift across modules
export interface RequestForm {
    id?: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    pickup_location?: string;
    dropoff_location?: string;
    service_type?: string;
    item_size?: string;
    preferred_date?: string;
    preferred_time?: string;
    estimated_value?: string;
    description?: string;
    pickup_floor?: number;
    pickup_unit_number?: string;
    pickup_parking_info?: string;
    dropoff_floor?: number;
    dropoff_unit_number?: string;
    dropoff_parking_info?: string;
    number_of_rooms?: number;
    number_of_floors?: number;
    property_type?: 'house' | 'apartment' | 'office' | 'storage';
    has_elevator?: boolean;
    dropoff_property_type?: 'house' | 'apartment' | 'office' | 'storage';
    dropoff_number_of_rooms?: number;
    storage_duration?: string | undefined;
    vehicle_type?: 'motorcycle' | 'car' | 'suv' | 'truck' | 'van';
    international_destination?: string | undefined;
    special_handling?: string | undefined;
    is_flexible?: boolean;
    needs_insurance?: boolean;
    request_type: 'instant' | 'bidding' | 'journey';
    photo_urls?: string[];
    inventory_list?: File | undefined;
    item_weight?: string;
    item_dimensions?: string;
    needs_disassembly?: boolean;
    is_fragile?: boolean;
    pickup_number_of_floors?: number;
    dropoff_number_of_floors?: number;
    pickup_has_elevator?: boolean;
    dropoff_has_elevator?: boolean;
    moving_items?: any[];
    journey_stops?: any[];
    status?: string;
    created_at?: string;
    updated_at?: string;
    pickup_coordinates?: { lat: number; lng: number };
    dropoff_coordinates?: { lat: number; lng: number };
    selected_price?: number;
    staff_count?: number;
    selected_date?: string;
    request_id?: string;
    user_id?: string;
    estimated_distance?: string;
}

const initialValues: RequestForm = {
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    pickup_location: '',
    dropoff_location: '',
    service_type: 'Residential Moving',
    item_size: 'medium',
    preferred_date: '',
    preferred_time: '',
    estimated_value: '',
    description: '',
    pickup_floor: 0,
    pickup_unit_number: '',
    pickup_parking_info: '',
    dropoff_floor: 0,
    dropoff_unit_number: '',
    dropoff_parking_info: '',
    number_of_rooms: 1,
    number_of_floors: 1,
    property_type: 'house',
    has_elevator: false,
    dropoff_property_type: 'house',
    dropoff_number_of_rooms: 1,
    dropoff_number_of_floors: 1,
    dropoff_has_elevator: false,
    storage_duration: undefined,
    vehicle_type: 'van',
    international_destination: undefined,
    special_handling: undefined,
    is_flexible: false,
    needs_insurance: false,
    request_type: 'instant',
    photo_urls: [],
    inventory_list: undefined,
    item_weight: '',
    item_dimensions: '',
    needs_disassembly: false,
    is_fragile: false,
    pickup_number_of_floors: 1,
    pickup_has_elevator: false,
    moving_items: [],
    journey_stops: [],
    selected_price: undefined,
    staff_count: undefined,
    selected_date: undefined,
    request_id: undefined,
    user_id: undefined,
};

interface ServiceRequestState {
    formValues: RequestForm;
    currentStep: number;
    isLoading: boolean;
    isEditing: boolean;
    request_id: string | null;
    stepSubmissions: Record<string, Partial<RequestForm>>;
    errors: Record<string, string | undefined>;
    pricePreview: {
        loading: boolean;
        data: any;
        error: string | null;
    };
    drafts: Record<string, RequestForm>;
    bookingDetails: {
        name: string;
        email: string;
        phone: string;
        staffCount: number;
        stops: Array<{
            type: 'pickup' | 'dropoff' | 'stop';
            location: string;
            unit_number?: string;
            floor?: string;
            instructions?: string;
            postcode?: string;
        }>;
        request_type: 'instant' | 'journey';
        moving_items?: Array<{
            id: string;
            name: string;
            category: string;
            quantity: number;
            weight?: string;
            dimensions?: string;
            value?: string;
            fragile?: boolean;
            needs_disassembly?: boolean;
            notes?: string;
            photo?: string | null;
            special_instructions?: string;
        }>;
    } | null;
}

// API endpoints
const API_ENDPOINTS = {
    create: {
        step1: '/requests/',
        step2: (id: string) => `/requests/${id}/submit_step2/`,
        step3: (id: string) => `/requests/${id}/submit_step3/`,
        step4: (id: string) => `/requests/${id}/submit_step4/`,
    },
    edit: {
        step1: (id: string) => `/requests/${id}/submit_step1/`,
        step2: (id: string) => `/requests/${id}/submit_step2/`,
        step3: (id: string) => `/requests/${id}/submit_step3/`,
        step4: (id: string) => `/requests/${id}/submit_step4/`,
    },
};

// Generic step submission thunk
export const submitStepToAPI = createAsyncThunk(
    'createRequest/submitStepToAPI',
    async ({ step, payload, isEditing, request_id }: { step: number; payload: any; isEditing?: boolean; request_id?: string }, { rejectWithValue, dispatch, getState }) => {
        try {
            console.log('Starting submitStepToAPI with:', { step, payload, isEditing, request_id });

            const state = getState() as { serviceRequest: ServiceRequestState };
            const currentrequest_id = request_id || state.serviceRequest.request_id || state.serviceRequest.formValues.request_id;
            console.log('the current request id', currentrequest_id);
            const request_type = state.serviceRequest.formValues.request_type;

            // Handle items based on step and request type
            if (step === 2 && request_type === 'journey') {
                // For journey requests, items come with journey stops in step 2
                payload.journey_stops = payload.journey_stops.map((stop: any) => ({
                    ...stop,
                    items: state.serviceRequest.formValues.moving_items,
                }));
            } else if (step === 3 && request_type === 'instant') {
                // For instant requests, items come in step 3
                payload.moving_items = state.serviceRequest.formValues.moving_items;
            }

            function getEndpoint(step: number, request_id?: string): string {
                if (step === 1 && !request_id) {
                    const createEndpoint = API_ENDPOINTS.create[`step${step}` as keyof typeof API_ENDPOINTS.create] as string | ((id: string) => string);
                    return typeof createEndpoint === 'string' ? createEndpoint : createEndpoint('');
                }
                if (request_id) {
                    const editEndpoint = API_ENDPOINTS.edit[`step${step}` as keyof typeof API_ENDPOINTS.edit] as (id: string) => string;
                    return editEndpoint(request_id);
                }
                throw new Error('request_id is required for steps after 1');
            }
            const endpoint = getEndpoint(step, currentrequest_id ?? undefined);

            const method: 'post' | 'put' | 'patch' = !currentrequest_id && step === 1 ? 'post' : currentrequest_id ? 'put' : 'patch';

            const response = await axiosInstance[method](endpoint, { ...payload, request_id: currentrequest_id });

            if (!response || !response.data) {
                throw new Error('Invalid API response');
            }

            const { data } = response;

            // Save draft if this is a new request
            if (!isEditing && data.request_id) {
                dispatch(addDraft({ id: data.request_id, data: state.serviceRequest.formValues }));
            } else if (isEditing && data.request_id) {
                dispatch(updateDraft({ id: data.request_id, data: state.serviceRequest.formValues }));
            }

            return {
                step,
                status: response.status,
                data: response.data,
                isEditing,
                request_id: state.serviceRequest.request_id || response.data?.request_id || null,
            };
        } catch (error: any) {
            console.log(error);
            console.error('API Error Details:', error);
            return rejectWithValue({
                error: error.response?.data?.message || error.message || 'An error occurred',
                step,
            });
        }
    }
);

// When leaving the request page, archive the active form as a draft (bounded to 3) and clear the active session
export const archiveActiveRequestAndReset = createAsyncThunk(
    'createRequest/archiveActiveAndReset',
    async (_: void, { getState, dispatch }) => {
        const state = getState() as { serviceRequest: ServiceRequestState };
        const activeId = state.serviceRequest.request_id ?? `local-${Date.now()}`;
        // store/replace as a local draft (cap enforcement happens in reducer)
        dispatch(addDraft({ id: activeId, data: state.serviceRequest.formValues }));
        // clear active
        localStorage.removeItem('activeServiceRequest');
        // reset form in slice
        dispatch(resetForm());
        return { archivedId: activeId };
    }
);

// Price preview thunk
export const getPricePreview = createAsyncThunk('serviceRequest/getPricePreview', async (request_id: string, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/api/request/${request_id}/price-preview`);
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error getting price preview');
    }
});

const persistedActive = loadActiveRequestFromStorage();

const initialState: ServiceRequestState = {
    formValues: { ...initialValues, ...(persistedActive.formValues || {}) } as RequestForm,
    currentStep: 1,
    isLoading: false,
    isEditing: false,
    request_id: (persistedActive.request_id as string | undefined) ?? null,
    stepSubmissions: {},
    errors: {},
    pricePreview: {
        loading: false,
        data: null,
        error: null,
    },
    drafts: {},
    bookingDetails: null,
};

const serviceRequestSlice = createSlice({
    name: 'serviceRequest',
    initialState,
    reducers: {
        setEditingMode: (state, action: PayloadAction<{ isEditing: boolean; request_id?: string }>) => {
            state.isEditing = action.payload.isEditing;
            state.request_id = action.payload.request_id || null;
            saveActiveRequestToStorage(state.formValues, state.request_id);
        },
        resetForm: (state) => {
            const next = initialState;
            saveActiveRequestToStorage(next.formValues, next.request_id);
            return next;
        },
        updateFormValues: (state, action: PayloadAction<Partial<RequestForm> & { step?: number }>) => {
            const { step, ...values } = action.payload;

            // Update the main form values
            state.formValues = {
                ...state.formValues,
                ...values,
                moving_items: values.moving_items || state.formValues.moving_items,
                journey_stops: values.journey_stops || state.formValues.journey_stops,
            };

            saveActiveRequestToStorage(state.formValues, state.request_id);

            // Update step submissions if this step exists
            if (step) {
                const stepKey = `step${step}`;
                state.stepSubmissions[stepKey] = {
                    ...(state.stepSubmissions[stepKey] || {}),
                    ...values,
                } as any;
            }
        },
        setCurrentStep: (state, action: PayloadAction<number>) => {
            console.log('settig next step', action.payload);
            state.currentStep = Math.min(Math.max(1, action.payload), 4);
            console.log('the current step', state.currentStep);
        },
        setStepData: (state, action: PayloadAction<{ step: number; data: Partial<RequestForm> }>) => {
            const { step, data } = action.payload;
            const stepKey = `step${step}`;

            // Update step submissions
            state.stepSubmissions[stepKey] = {
                ...(state.stepSubmissions[stepKey] || {}),
                ...data,
            };

            // Update form values
            state.formValues = {
                ...state.formValues,
                ...data,
                moving_items: data.moving_items || state.formValues.moving_items,
                journey_stops: data.journey_stops || state.formValues.journey_stops,
            };

            saveActiveRequestToStorage(state.formValues, state.request_id);
        },
        updateFormField: (state, action: PayloadAction<{ field: keyof RequestForm; value: any; step?: number }>) => {
            const { field, value, step } = action.payload;

            // Update the main form values
            state.formValues = {
                ...state.formValues,
                [field]: value,
            };

            saveActiveRequestToStorage(state.formValues, state.request_id);

            // Update step submissions if this step exists
            if (step) {
                const stepKey = `step${step}`;
                state.stepSubmissions[stepKey] = {
                    ...(state.stepSubmissions[stepKey] || {}),
                    [field]: value,
                } as any;
            }
        },
        setrequest_id: (state, action: PayloadAction<string>) => {
            state.request_id = action.payload;
            saveActiveRequestToStorage(state.formValues, state.request_id);
        },
        setBookingDetails: (state, action: PayloadAction<ServiceRequestState['bookingDetails']>) => {
            state.bookingDetails = action.payload;
            saveActiveRequestToStorage(state.formValues, state.request_id);
        },
        updateBookingDetails: (state, action: PayloadAction<Partial<ServiceRequestState['bookingDetails']>>) => {
            if (state.bookingDetails) {
                state.bookingDetails = {
                    ...state.bookingDetails,
                    ...action.payload,
                };
                saveActiveRequestToStorage(state.formValues, state.request_id);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(submitStepToAPI.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(submitStepToAPI.fulfilled, (state, action) => {
                state.isLoading = false;
                const { step, data, isEditing } = action.payload;

                // Update request ID if it's a new request
                if (data.request_id && !state.request_id) {
                    state.request_id = data.request_id;
                }

                // Update step submissions
                state.stepSubmissions[`step${step}`] = data;

                // Update form values with API data
                state.formValues = {
                    ...state.formValues,
                    ...data,
                    moving_items: data.moving_items || state.formValues.moving_items,
                    journey_stops: data.journey_stops || state.formValues.journey_stops,
                    estimated_distance: data.estimated_distance || state.formValues.estimated_distance
                };

                state.errors[`step${step}`] = undefined;
                state.isEditing = isEditing || false;

                // Save/replace local draft with the latest form
                if (!isEditing && data.request_id) {
                    state.drafts[data.request_id] = state.formValues;
                } else if (isEditing && data.request_id) {
                    state.drafts[data.request_id] = state.formValues;
                }

                saveActiveRequestToStorage(state.formValues, state.request_id);
            })
            .addCase(submitStepToAPI.rejected, (state, action) => {
                state.isLoading = false;
                const { error, step } = action.payload as { error: string; step: number };
                state.errors[`step${step}`] = error;
            });

        builder
            .addCase(getPricePreview.pending, (state) => {
                state.pricePreview.loading = true;
                state.pricePreview.error = null;
            })
            .addCase(getPricePreview.fulfilled, (state, action) => {
                state.pricePreview.loading = false;
                state.pricePreview.data = action.payload;
            })
            .addCase(getPricePreview.rejected, (state, action) => {
                state.pricePreview.loading = false;
                state.pricePreview.error = action.payload as string;
            });
    },
});

export const { setEditingMode, resetForm, updateFormValues, setCurrentStep, setStepData, updateFormField, setrequest_id, setBookingDetails, updateBookingDetails } = serviceRequestSlice.actions;

export default serviceRequestSlice.reducer;
