import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { InstantRequestData, InstantRequestService } from '../../services/instantRequestService';

// Simplified state for instant requests
interface InstantRequestState {
  // Form data collected through the flow
  formData: {
    // Service details
    serviceName: string;
    serviceType: string;
    
    // Contact info (from EmailModal or auth)
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    user_id?: string;
    
    // Location data (from ServiceDetails)
    pickup_location: string;
    pickup_address: string;
    pickup_postcode: string;
    pickup_city: string;
    pickup_county: string;
    pickup_coordinates?: { lat: number; lng: number };
    pickup_property_type?: string;
    pickup_floor?: number;
    pickup_has_elevator?: boolean;
    pickup_number_of_floors?: number;
    
    dropoff_location: string;
    dropoff_address: string;
    dropoff_postcode: string;
    dropoff_city: string;
    dropoff_county: string;
    dropoff_coordinates?: { lat: number; lng: number };
    dropoff_property_type?: string;
    dropoff_floor?: number;
    dropoff_has_elevator?: boolean;
    dropoff_number_of_floors?: number;
    
    // Items (from ListingInventory)
    moving_items: Array<{
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
      special_instructions?: string;
    }>;
    
    // Price selection (from PriceForecast)
    selected_price?: number;
    staff_count?: number;
    selected_date?: string;
    
    // Additional details
    description?: string;
    special_handling?: string;
    is_flexible?: boolean;
    needs_insurance?: boolean;
  };
  
  // Request state
  request_id?: string;
  isLoading: boolean;
  error: string | null;
  
  // Current step in the flow
  currentStep: 'service-details' | 'listing-inventory' | 'price-forecast' | 'booking-details' | 'summary';
}

const initialState: InstantRequestState = {
  formData: {
    serviceName: '',
    serviceType: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    pickup_location: '',
    pickup_address: '',
    pickup_postcode: '',
    pickup_city: '',
    pickup_county: '',
    dropoff_location: '',
    dropoff_address: '',
    dropoff_postcode: '',
    dropoff_city: '',
    dropoff_county: '',
    moving_items: [],
  },
  request_id: undefined,
  isLoading: false,
  error: null,
  currentStep: 'service-details',
};

// Create instant request
export const createInstantRequest = createAsyncThunk(
  'instantRequest/createInstantRequest',
  async (data: InstantRequestData, { rejectWithValue }) => {
    try {
      const result = await InstantRequestService.createInstantRequest(data);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Submit booking details
export const submitBookingDetails = createAsyncThunk(
  'instantRequest/submitBookingDetails',
  async ({ requestId, bookingData }: { requestId: string; bookingData: any }, { rejectWithValue }) => {
    try {
      const result = await InstantRequestService.submitBookingDetails(requestId, bookingData);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const instantRequestSlice = createSlice({
  name: 'instantRequest',
  initialState,
  reducers: {
    // Update form data
    updateFormData: (state, action: PayloadAction<Partial<InstantRequestState['formData']>>) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    
    // Set current step
    setCurrentStep: (state, action: PayloadAction<InstantRequestState['currentStep']>) => {
      state.currentStep = action.payload;
    },
    
    // Set request ID
    setRequestId: (state, action: PayloadAction<string>) => {
      state.request_id = action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset form
    resetForm: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create request
      .addCase(createInstantRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createInstantRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.request_id = action.payload.request_id;
      })
      .addCase(createInstantRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Submit booking details
      .addCase(submitBookingDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitBookingDetails.fulfilled, (state) => {
        state.isLoading = false;
        state.currentStep = 'summary';
      })
      .addCase(submitBookingDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateFormData, setCurrentStep, setRequestId, clearError, resetForm } = instantRequestSlice.actions;
export default instantRequestSlice.reducer;
