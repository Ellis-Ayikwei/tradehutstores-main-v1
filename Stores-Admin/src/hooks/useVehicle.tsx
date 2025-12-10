import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../store';
import {
    fetchVehicles,
    fetchVehicleById,
    updateVehicleMileage,
    fetchVehicleDocuments,
    fetchVehicleInspections,
    fetchVehicleMaintenance,
    resetVehicleState,
    clearVehicleError,
} from '../store/slices/vehicleSlice';

export const useVehicle = () => {
    const dispatch = useDispatch();
    const { vehicles, currentVehicle, loading, error, message } = useSelector((state: RootState) => state.vehicle);

    const getVehicles = async (filters?: { provider?: string; type?: string; active?: boolean; registration?: string; driver?: string }) => {
        return await dispatch(fetchVehicles(filters)).unwrap();
    };

    const getVehicleById = async (id: string) => {
        return await dispatch(fetchVehicleById(id)).unwrap();
    };

    const updateMileage = async (id: string, mileage: number) => {
        return await dispatch(updateVehicleMileage({ id, mileage })).unwrap();
    };

    const getVehicleDocuments = async (id: string) => {
        return await dispatch(fetchVehicleDocuments(id)).unwrap();
    };

    const getVehicleInspections = async (id: string) => {
        return await dispatch(fetchVehicleInspections(id)).unwrap();
    };

    const getVehicleMaintenance = async (id: string) => {
        return await dispatch(fetchVehicleMaintenance(id)).unwrap();
    };

    const resetState = () => {
        dispatch(resetVehicleState());
    };

    const clearError = () => {
        dispatch(clearVehicleError());
    };

    return {
        // State
        vehicles,
        currentVehicle,
        loading,
        error,
        message,
        // Actions
        getVehicles,
        getVehicleById,
        updateMileage,
        getVehicleDocuments,
        getVehicleInspections,
        getVehicleMaintenance,
        resetState,
        clearError,
    };
};

export default useVehicle;
