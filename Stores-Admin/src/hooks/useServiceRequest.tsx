import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store';
import {
    ServiceRequest,
    RequestItem,
    JourneyStop,
    ItemCategory,
    CommonItem,
    fetchServiceRequests,
    fetchServiceRequestById,
    createServiceRequest,
    updateServiceRequest,
    submitServiceRequest,
    cancelServiceRequest,
    fetchItemCategories,
    fetchCommonItems,
    fetchCategoriesWithItems,
    setCurrentRequest,
    updateCurrentRequest,
    clearCurrentRequest,
    addJourneyStop,
    updateJourneyStop,
    removeJourneyStop,
    addRequestItem,
    updateRequestItem,
    removeRequestItem,
} from '../store/slices/serviceRequestSice';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';

interface RootState {
    serviceRequests: {
        requests: ServiceRequest[];
        currentRequest: ServiceRequest | null;
        categories: ItemCategory[];
        commonItems: CommonItem[];
        loading: boolean;
        error: string | null;
    };
}

type AppThunkDispatch = ThunkDispatch<RootState, any, AnyAction>;

export const useServiceRequest = () => {
    const dispatch = useDispatch<AppThunkDispatch>();
    const { requests, currentRequest, categories, commonItems, loading, error } = useSelector((state: RootState) => state.serviceRequests);

    // Fetch all requests for a user
    const fetchRequests = async (userId?: string) => {
        try {
            const result = await dispatch(fetchServiceRequests(userId)).unwrap();
            return result;
        } catch (error) {
            console.error('Error fetching requests:', error);
            throw error;
        }
    };

    // Fetch a single request by ID
    const fetchRequestById = async (requestId: string) => {
        try {
            const result = await dispatch(fetchServiceRequestById(requestId)).unwrap();
            return result;
        } catch (error) {
            console.error('Error fetching request:', error);
            throw error;
        }
    };

    // Create a new service request
    const createRequest = async (request: ServiceRequest) => {
        try {
            const result = await dispatch(createServiceRequest(request)).unwrap();
            return result;
        } catch (error) {
            console.error('Error creating request:', error);
            throw error;
        }
    };

    // Update an existing service request
    const updateRequest = async (id: string, request: Partial<ServiceRequest>) => {
        try {
            const result = await dispatch(updateServiceRequest({ id, request })).unwrap();
            return result;
        } catch (error) {
            console.error('Error updating request:', error);
            throw error;
        }
    };

    // Submit a service request
    const submitRequest = async (id: string) => {
        try {
            const result = await dispatch(submitServiceRequest(id)).unwrap();
            return result;
        } catch (error) {
            console.error('Error submitting request:', error);
            throw error;
        }
    };

    // Cancel a service request
    const cancelRequest = async (id: string, reason: string) => {
        try {
            const result = await dispatch(cancelServiceRequest({ id, reason })).unwrap();
            return result;
        } catch (error) {
            console.error('Error canceling request:', error);
            throw error;
        }
    };

    // Fetch item categories
    const fetchCategories = async () => {
        try {
            const result = await dispatch(fetchItemCategories()).unwrap();
            return result;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    };

    // Fetch common items
    const fetchItems = async () => {
        try {
            const result = await dispatch(fetchCommonItems()).unwrap();
            return result;
        } catch (error) {
            console.error('Error fetching common items:', error);
            throw error;
        }
    };

    // Fetch categories with their items
    const fetchCategoriesItems = async () => {
        try {
            const result = await dispatch(fetchCategoriesWithItems()).unwrap();
            return result;
        } catch (error) {
            console.error('Error fetching categories with items:', error);
            throw error;
        }
    };

    // Current request management
    const setRequest = (request: ServiceRequest | null) => {
        dispatch(setCurrentRequest(request));
    };

    const updateCurrentRequestData = (data: Partial<ServiceRequest>) => {
        dispatch(updateCurrentRequest(data));
    };

    const clearRequest = () => {
        dispatch(clearCurrentRequest());
    };

    // Journey stop management
    const addStop = (stop: JourneyStop) => {
        dispatch(addJourneyStop(stop));
    };

    const updateStop = (index: number, stop: JourneyStop) => {
        dispatch(updateJourneyStop({ index, stop }));
    };

    const removeStop = (index: number) => {
        dispatch(removeJourneyStop(index));
    };

    // Request item management
    const addItem = (item: RequestItem) => {
        dispatch(addRequestItem(item));
    };

    const updateItem = (index: number, item: RequestItem) => {
        dispatch(updateRequestItem({ index, item }));
    };

    const removeItem = (index: number) => {
        dispatch(removeRequestItem(index));
    };

    return {
        // State
        requests,
        currentRequest,
        categories,
        commonItems,
        loading,
        error,

        // API actions
        fetchRequests,
        fetchRequestById,
        createRequest,
        updateRequest,
        submitRequest,
        cancelRequest,
        fetchCategories,
        fetchItems,
        fetchCategoriesItems,

        // Current request management
        setRequest,
        updateCurrentRequestData,
        clearRequest,

        // Journey stop management
        addStop,
        updateStop,
        removeStop,

        // Request item management
        addItem,
        updateItem,
        removeItem,
    };
};

export default useServiceRequest;
