import { Car, Edit, Plus, Trash2, Eye } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DraggableDataTable, { ColumnDefinition } from '../../../../../../components/ui/DraggableDataTable';
import vehicleService, { Vehicle } from '../../../../../../services/vehicleService';
import showMessage from '../../../../../../helper/showMessage';
import { Provider } from '../../types';

interface VehiclesTabProps {
    provider: Provider;
    onProviderUpdate?: () => void;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({ provider, onProviderUpdate }) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    console.log('Provider in VehiclesTab:', provider);
    console.log('Provider ID type:', typeof provider.id);
    console.log('Provider ID value:', provider.id);

    useEffect(() => {
        fetchVehicles();
    }, [provider.id]);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const vehiclesData = await vehicleService.getVehiclesByProvider(provider.id);
            setVehicles(vehiclesData || []);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            showMessage('error', 'Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!window.confirm('Are you sure you want to delete this vehicle?')) {
            return;
        }
        
        try {
            await vehicleService.deleteVehicle(vehicleId);
            showMessage('success', 'Vehicle deleted successfully');
            fetchVehicles(); // Refresh the list
            onProviderUpdate?.();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            showMessage('error', 'Failed to delete vehicle');
        }
    };

    const columns: ColumnDefinition[] = [
        {
            accessor: 'details',
            title: 'Vehicle Details',
            render: (vehicle: Vehicle) => (
                <div className="flex items-center">
                    <Car className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-sm text-gray-500">
                            {vehicle.year} • {vehicle.vehicle_type?.name || 'N/A'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            accessor: 'registration',
            title: 'Registration',
            render: (vehicle: Vehicle) => (
                <div>
                    <div className="text-sm text-gray-900">{vehicle.registration}</div>
                </div>
            ),
        },
        {
            accessor: 'is_active',
            title: 'Status',
            render: (vehicle: Vehicle) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {vehicle.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (vehicle: Vehicle) => (
                <div className="flex justify-end space-x-2">
                    <button 
                        className="text-green-600 hover:text-green-900" 
                        title="View Vehicle" 
                        onClick={() => navigate(`/vehicle-management/view/${vehicle.id}`)}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button 
                        className="text-blue-600 hover:text-blue-900" 
                        title="Edit Vehicle" 
                        onClick={() => navigate(`/vehicle-management/edit/${vehicle.id}?providerId=${provider.id}`)}
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button 
                        className="text-red-600 hover:text-red-900" 
                        title="Delete Vehicle"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
            textAlign: 'right',
        },
    ];

    return (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center">
                    <Car className="w-5 h-5 text-blue-500 mr-2" />
                    <h3 className="text-lg font-semibold">Provider Vehicles</h3>
                </div>
                <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm flex items-center" 
                    onClick={() => navigate(`/vehicle-management/add?providerId=${provider.id}`)}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Vehicle
                </button>
            </div>
            <DraggableDataTable
                data={vehicles}
                columns={columns}
                loading={loading}
                title="Vehicles"
                storeKey={`provider-vehicles-table-${provider.id}`}
            />
        </div>
    );
};
