import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import themeConfigSlice from './themeConfigSlice';
import paymentSlice from './slices/paymentSlice';
import serviceRequestSlice from './slices/createRequestSlice';

export const store = configureStore({
    reducer: {
        themeConfig: themeConfigSlice,
        payments: paymentSlice,
        serviceRequest: serviceRequestSlice,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export interface IRootState extends RootState {}
