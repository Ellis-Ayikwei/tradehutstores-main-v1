import { combineReducers, configureStore } from '@reduxjs/toolkit';
import themeConfigSlice from './themeConfigSlice';
import usersSlice from './usersSlice';
import vehicleSlice from './slices/vehicleSlice';
import paymentSlice from './slices/paymentSlice';
import serviceRequestSlice from './slices/serviceRequestSice';

import authSlice from './authSlice';
import createRequestSlice from './slices/createRequestSlice';
import draftRequestsSlice from './slices/draftRequestsSlice';
import viewModeSlice from './slices/viewModeSlice';

// const persistedAuthReducer = persistReducer(authPersistConfig, authSlice);
const rootReducer = combineReducers({
    themeConfig: themeConfigSlice,
    auth: authSlice,
    usersdata: usersSlice,
    vehicle: vehicleSlice,
    payments: paymentSlice,
    serviceRequests: serviceRequestSlice,
    serviceRequest: createRequestSlice,
    draftRequests: draftRequestsSlice,
    viewMode: viewModeSlice,
});

const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {},
        }),
});

export type IRootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export { store };
export default store;
