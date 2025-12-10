import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ViewModeState {
    isProviderMode: boolean;
}

const initialState: ViewModeState = {
    isProviderMode: false,
};

const viewModeSlice = createSlice({
    name: 'viewMode',
    initialState,
    reducers: {
        setProviderMode: (state, action: PayloadAction<boolean>) => {
            state.isProviderMode = action.payload;
            localStorage.setItem('viewMode', action.payload ? 'provider' : 'customer');
        },
        toggleViewMode: (state) => {
            state.isProviderMode = !state.isProviderMode;
            localStorage.setItem('viewMode', state.isProviderMode ? 'provider' : 'customer');
        },
        resetViewMode: (state) => {
            state.isProviderMode = false;
            localStorage.setItem('viewMode', 'customer');
        },
        initializeViewMode: (state, action: PayloadAction<string>) => {
            const userType = action.payload.toLowerCase();
            const isProvider = userType === 'provider' || userType === 'business' || userType === 'admin';
            state.isProviderMode = isProvider;
            localStorage.setItem('viewMode', isProvider ? 'provider' : 'customer');
        },
    },
});

export const { setProviderMode, toggleViewMode, resetViewMode, initializeViewMode } = viewModeSlice.actions;
export default viewModeSlice.reducer; 