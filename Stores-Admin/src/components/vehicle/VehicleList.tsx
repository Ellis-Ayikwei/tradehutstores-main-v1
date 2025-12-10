import React, { useEffect, useState } from 'react';
import useVehicle from '../../hooks/useVehicle';

interface Vehicle {
    id: string;
    registration: string;
    vehicle_type: string;
    make: string;
    model: string;
    year: number;
    current_mileage: number;
    is_active: boolean;
}

const VehicleList: React.FC = () => {
    const { vehicles, loading, error, getVehicles, clearError } = useVehicle();

    const [filters, setFilters] = useState({
        type: '',
        active: true,
        registration: '',
    });

    useEffect(() => {
        getVehicles(filters);
    }, [filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full">Loading...</div>;
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                {error}
                <button onClick={clearError} className="ml-4 text-blue-500 underline">
                    Dismiss
                </button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-6 grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                        name="type"
                        value={filters.type}
                        onChange={handleFilterChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">All Types</option>
                        <option value="van">Van</option>
                        <option value="truck">Truck</option>
                        <option value="car">Car</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Registration</label>
                    <input
                        type="text"
                        name="registration"
                        value={filters.registration}
                        onChange={handleFilterChange}
                        placeholder="Search by registration"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-2">
                        <input type="checkbox" name="active" checked={filters.active} onChange={handleFilterChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="ml-2">Active Only</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Make/Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mileage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {vehicles.map((vehicle: Vehicle) => (
                            <tr key={vehicle.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{vehicle.registration}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{vehicle.vehicle_type}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {vehicle.make} {vehicle.model}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{vehicle.year}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{vehicle.current_mileage.toLocaleString()} km</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {vehicle.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VehicleList;
