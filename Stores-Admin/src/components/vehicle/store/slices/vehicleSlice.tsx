import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';
import ShowRequestError from '../../helper/showRequestError';

interface Vehicle {
    id: string;
    registration: string;
    vehicle_type: string;
    make: string;
    model: string;
    year: number;
    current_mileage: number;
    is_active: boolean;
    provider_id: string;
    primary_driver_id?: string;
}

interface VehicleState {
    vehicles: Vehicle[];
    currentVehicle: Vehicle | null;
    loading: boolean;
    error: string | null;
    message: string | null;
}

const initialState: VehicleState = {
    vehicles: [],
    currentVehicle: null,
    loading: false,
    error: null,
    message: null,
};

// Async thunks
export const fetchVehicles = createAsyncThunk(
    'vehicle/fetchVehicles',
    async (filters?: { provider?: string; type?: string; active?: boolean; registration?: string; driver?: string }, { rejectWithValue }) => {
        try {
            const queryParams = new URLSearchParams();
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined) {
                        queryParams.append(key, String(value));
                    }
                });
            }

            const response = await axiosInstance.get(`/vehicles/?${queryParams.toString()}`);
            return response.data;
        } catch (error: any) {
            ShowRequestError(error);
            return rejectWithValue(error.response?.data || 'Failed to fetch vehicles');
        }
    }
);

export const fetchVehicleById = createAsyncThunk('vehicle/fetchVehicleById', async (id: string, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/vehicles/${id}/`);
        return response.data;
    } catch (error: any) {
        ShowRequestError(error);
        return rejectWithValue(error.response?.data || 'Failed to fetch vehicle');
    }
});

export const updateVehicleMileage = createAsyncThunk('vehicle/updateMileage', async ({ id, mileage }: { id: string; mileage: number }, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.post(`/vehicles/${id}/update_mileage/`, { mileage });
        return response.data;
    } catch (error: any) {
        ShowRequestError(error);
        return rejectWithValue(error.response?.data || 'Failed to update mileage');
    }
});

export const fetchVehicleDocuments = createAsyncThunk('vehicle/fetchDocuments', async (id: string, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/vehicles/${id}/documents/`);
        return response.data;
    } catch (error: any) {
        ShowRequestError(error);
        return rejectWithValue(error.response?.data || 'Failed to fetch vehicle documents');
    }
});

export const fetchVehicleInspections = createAsyncThunk('vehicle/fetchInspections', async (id: string, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/vehicles/${id}/inspections/`);
        return response.data;
    } catch (error: any) {
        ShowRequestError(error);
        return rejectWithValue(error.response?.data || 'Failed to fetch vehicle inspections');
    }
});

export const fetchVehicleMaintenance = createAsyncThunk('vehicle/fetchMaintenance', async (id: string, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/vehicles/${id}/maintenance/`);
        return response.data;
    } catch (error: any) {
        ShowRequestError(error);
        return rejectWithValue(error.response?.data || 'Failed to fetch maintenance records');
    }
});

// Slice
const vehicleSlice = createSlice({
    name: 'vehicle',
    initialState,
    reducers: {
        resetVehicleState: (state) => {
            state.vehicles = [];
            state.currentVehicle = null;
            state.error = null;
            state.message = null;
        },
        clearVehicleError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Vehicles
            .addCase(fetchVehicles.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchVehicles.fulfilled, (state, action) => {
                state.vehicles = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(fetchVehicles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Vehicle by ID
            .addCase(fetchVehicleById.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchVehicleById.fulfilled, (state, action) => {
                state.currentVehicle = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(fetchVehicleById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Update Vehicle Mileage
            .addCase(updateVehicleMileage.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateVehicleMileage.fulfilled, (state, action) => {
                if (state.currentVehicle && action.payload.id === state.currentVehicle.id) {
                    state.currentVehicle = action.payload;
                }
                state.vehicles = state.vehicles.map((vehicle) => (vehicle.id === action.payload.id ? action.payload : vehicle));
                state.loading = false;
                state.message = 'Mileage updated successfully';
            })
            .addCase(updateVehicleMileage.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { resetVehicleState, clearVehicleError } = vehicleSlice.actions;
export default vehicleSlice.reducer;
