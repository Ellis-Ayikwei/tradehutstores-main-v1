import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
    provider_id: string;
    primary_driver_id?: string;
}

const VehicleDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { currentVehicle, loading, error, message, getVehicleById, updateMileage, getVehicleDocuments, getVehicleInspections, getVehicleMaintenance, clearError } = useVehicle();

    const [newMileage, setNewMileage] = useState<string>('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [inspections, setInspections] = useState<any[]>([]);
    const [maintenance, setMaintenance] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'inspections' | 'maintenance'>('info');

    useEffect(() => {
        if (id) {
            loadVehicleData();
        }
    }, [id]);

    const loadVehicleData = async () => {
        if (!id) return;

        try {
            await getVehicleById(id);
            const [docs, inspecs, maint] = await Promise.all([getVehicleDocuments(id), getVehicleInspections(id), getVehicleMaintenance(id)]);
            setDocuments(docs);
            setInspections(inspecs);
            setMaintenance(maint);
        } catch (error) {
            console.error('Error loading vehicle data:', error);
        }
    };

    const handleMileageUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !newMileage) return;

        try {
            await updateMileage(id, parseInt(newMileage));
            setNewMileage('');
        } catch (error) {
            console.error('Error updating mileage:', error);
        }
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

    if (!currentVehicle) {
        return <div className="text-center p-4">Vehicle not found</div>;
    }

    return (
        <div className="p-4">
            {message && <div className="bg-green-100 text-green-800 p-4 mb-4 rounded">{message}</div>}

            <div className="bg-white shadow rounded-lg">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        {(['info', 'documents', 'inspections', 'maintenance'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`${
                                    activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm capitalize`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                                <dl className="grid grid-cols-1 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Registration</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{currentVehicle.registration}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Type</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{currentVehicle.vehicle_type}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Make/Model</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {currentVehicle.make} {currentVehicle.model}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Year</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{currentVehicle.year}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Current Mileage</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{currentVehicle.current_mileage.toLocaleString()} km</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                                        <dd className="mt-1">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    currentVehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {currentVehicle.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-gray-900">Update Mileage</h4>
                                    <form onSubmit={handleMileageUpdate} className="mt-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={newMileage}
                                                onChange={(e) => setNewMileage(e.target.value)}
                                                placeholder="Enter new mileage"
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                min={currentVehicle.current_mileage}
                                            />
                                            <button
                                                type="submit"
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                Update
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Documents</h3>
                            {documents.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {documents.map((doc: any) => (
                                        <li key={doc.id} className="py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.document_type}</p>
                                                    <p className="text-sm text-gray-500">Expires: {new Date(doc.expiry_date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No documents found</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'inspections' && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Inspections</h3>
                            {inspections.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {inspections.map((inspection: any) => (
                                        <li key={inspection.id} className="py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{inspection.inspection_type}</p>
                                                    <p className="text-sm text-gray-500">Date: {new Date(inspection.inspection_date).toLocaleDateString()}</p>
                                                    <p className="text-sm text-gray-500">Status: {inspection.is_roadworthy ? 'Roadworthy' : 'Not Roadworthy'}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No inspections found</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'maintenance' && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Records</h3>
                            {maintenance.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {maintenance.map((record: any) => (
                                        <li key={record.id} className="py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{record.maintenance_type}</p>
                                                    <p className="text-sm text-gray-500">Date: {new Date(record.maintenance_date).toLocaleDateString()}</p>
                                                    <p className="text-sm text-gray-500">Cost: ${record.cost}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No maintenance records found</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleDetail;
