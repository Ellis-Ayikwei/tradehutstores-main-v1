// src/store/slices/serviceRequestSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { addDraft, updateDraft } from './draftRequestsSlice';

import axiosInstance from '../../services/axiosInstance';
import { ServiceRequest } from '../../types';
import { request } from 'http';
import { RootState } from '../index';

const initialValues: ServiceRequest = {
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
    formValues: ServiceRequest;
    currentStep: number;
    isLoading: boolean;
    isEditing: boolean;
    request_id: string | null;
    stepSubmissions: {
        step1?: ServiceRequest;
        step2?: ServiceRequest;
        step3?: ServiceRequest;
        step4?: ServiceRequest;
    };
    errors: {
        step1?: string;
        step2?: string;
        step3?: string;
        step4?: string;
    };
    pricePreview: {
        loading: boolean;
        data: any;
        error: string | null;
    };
    drafts: Record<string, ServiceRequest>;
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
            const currentrequest_id = request_id || state.serviceRequest.request_id;
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

            function getEndpoint(step: number, isEditing?: boolean, request_id?: string) {
                if (step > 1 && !request_id) {
                    throw new Error('request_id is required for steps after 1');
                }
                if (isEditing && request_id) {
                    return API_ENDPOINTS.edit[`step${step}` as keyof typeof API_ENDPOINTS.edit](request_id);
                }
                const createEndpoint = API_ENDPOINTS.create[`step${step}` as keyof typeof API_ENDPOINTS.create];
                return typeof createEndpoint === 'function' && request_id ? createEndpoint(request_id) : createEndpoint;
            }
            const endpoint = getEndpoint(step, isEditing, currentrequest_id);

            const method = !isEditing && step === 1 ? 'post' : isEditing && currentrequest_id ? 'put' : 'patch';

            const response = await axiosInstance[method](endpoint, payload);

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

// Price preview thunk
export const getPricePreview = createAsyncThunk('serviceRequest/getPricePreview', async (request_id: string, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/api/request/${request_id}/price-preview`);
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data || 'Error getting price preview');
    }
});

const initialState: ServiceRequestState = {
    formValues: initialValues,
    currentStep: 1,
    isLoading: false,
    isEditing: false,
    request_id: null,
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
        },
        resetForm: (state) => {
            return initialState;
        },
        updateFormValues: (state, action: PayloadAction<Partial<ServiceRequest> & { step?: number }>) => {
            const { step, ...values } = action.payload;

            // Update the main form values
            state.formValues = {
                ...state.formValues,
                ...values,
                moving_items: values.moving_items || state.formValues.moving_items,
                journey_stops: values.journey_stops || state.formValues.journey_stops,
            };

            // Update step submissions if this step exists
            if (step) {
                const stepKey = `step${step}` as keyof typeof state.stepSubmissions;
                if (state.stepSubmissions[stepKey]) {
                    state.stepSubmissions[stepKey] = {
                        ...state.stepSubmissions[stepKey],
                        ...values,
                    };
                }
            }
        },
        setCurrentStep: (state, action: PayloadAction<number>) => {
            console.log('settig next step', action.payload);
            state.currentStep = Math.min(Math.max(1, action.payload), 4);
            console.log('the current step', state.currentStep);
        },
        setStepData: (state, action: PayloadAction<{ step: number; data: any }>) => {
            const { step, data } = action.payload;
            const stepKey = `step${step}` as keyof typeof state.stepSubmissions;

            // Update step submissions
            state.stepSubmissions[stepKey] = data;

            // Update form values
            state.formValues = {
                ...state.formValues,
                ...data,
                moving_items: data.moving_items || state.formValues.moving_items,
                journey_stops: data.journey_stops || state.formValues.journey_stops,
            };
        },
        updateFormField: (state, action: PayloadAction<{ field: string; value: any; step?: number }>) => {
            const { field, value, step } = action.payload;

            // Update the main form values
            state.formValues = {
                ...state.formValues,
                [field]: value,
            };

            // Update step submissions if this step exists
            if (step) {
                const stepKey = `step${step}` as keyof typeof state.stepSubmissions;
                if (state.stepSubmissions[stepKey]) {
                    state.stepSubmissions[stepKey] = {
                        ...state.stepSubmissions[stepKey],
                        [field]: value,
                    };
                }
            }
        },
        setrequest_id: (state, action: PayloadAction<string>) => {
            state.request_id = action.payload;
        },
        setBookingDetails: (state, action: PayloadAction<ServiceRequestState['bookingDetails']>) => {
            state.bookingDetails = action.payload;
        },
        updateBookingDetails: (state, action: PayloadAction<Partial<ServiceRequestState['bookingDetails']>>) => {
            if (state.bookingDetails) {
                state.bookingDetails = {
                    ...state.bookingDetails,
                    ...action.payload,
                };
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
                };

                state.errors[`step${step}`] = undefined;
                state.isEditing = isEditing || false;

                // Save draft if this is a new request
                if (!isEditing && data.request_id) {
                    state.drafts[data.request_id] = state.formValues;
                } else if (isEditing && data.request_id) {
                    state.drafts[data.request_id] = state.formValues;
                }
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
