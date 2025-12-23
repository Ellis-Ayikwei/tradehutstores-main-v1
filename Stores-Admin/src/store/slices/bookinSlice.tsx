import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Booking {
  id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  date: string;
  pickup_location: string;
  dropoff_location: string;
  service_type: string;
  item_size: string;
  provider_name?: string;
  provider_rating?: number;
  price?: number;
  tracking_url?: string;
}

interface BookingState {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  loading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    fetchBookingsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchBookingsSuccess(state, action: PayloadAction<Booking[]>) {
      state.bookings = action.payload;
      state.loading = false;
    },
    fetchBookingsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    addBooking(state, action: PayloadAction<Booking>) {
      state.bookings.push(action.payload);
    },
    updateBooking(state, action: PayloadAction<Booking>) {
      const index = state.bookings.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
    },
    deleteBooking(state, action: PayloadAction<string>) {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload);
    },
  },
});

export const {
  fetchBookingsStart,
  fetchBookingsSuccess,
  fetchBookingsFailure,
  addBooking,
  updateBooking,
  deleteBooking,
} = bookingSlice.actions;

export default bookingSlice.reducer;