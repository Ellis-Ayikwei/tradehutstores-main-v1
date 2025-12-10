import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  AlertCircle, 
  X, 
  Truck, 
  Package,
  Ruler,
  Weight,
  CheckCircle,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  weight_capacity: number;
  is_available: boolean;
  current_location?: string;
  license_plate: string;
}

interface RequestDimensions {
  total_length: number;
  total_width: number;
  total_height: number;
  total_weight: number;
  unit: string;
}

interface AssignVehiclesModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedVehicles: Vehicle[]) => void;
  job: any;
  providerId: string;
  requiredVehicles: number;
  currentlyAssigned?: Vehicle[];
  requestDimensions: RequestDimensions;
}

const AssignVehiclesModal: React.FC<AssignVehiclesModalProps> = ({ 
  open, 
  onClose, 
  onConfirm,
  job,
  providerId,
  requiredVehicles,
  currentlyAssigned = [],
  requestDimensions
}) => {
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected vehicles with currently assigned ones
  useEffect(() => {
    if (currentlyAssigned.length > 0) {
      setSelectedVehicles(currentlyAssigned.map(vehicle => vehicle.id));
    }
  }, [currentlyAssigned]);

  // Fetch available vehicles
  useEffect(() => {
    if (open && providerId) {
      fetchAvailableVehicles();
    }
  }, [open, providerId]);

  const fetchAvailableVehicles = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/providers/${providerId}/available_vehicles/`);
      const vehicles = Array.isArray(response.data) ? response.data : [];
      setAvailableVehicles(vehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load available vehicles');
      setAvailableVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId);
      } else {
        if (prev.length < requiredVehicles) {
          return [...prev, vehicleId];
        }
        return [...prev.slice(0, requiredVehicles - 1), vehicleId];
      }
    });
  };

  const handleAssignVehicles = async () => {
    if (selectedVehicles.length !== requiredVehicles) {
      setError(`Please select exactly ${requiredVehicles} vehicle(s)`);
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post(`/jobs/${job.id}/assign_vehicles/`, {
        vehicle_ids: selectedVehicles,
        provider_id: providerId
      });
      
      // Get the selected vehicle objects
      const assignedVehicles = availableVehicles.filter(vehicle => 
        selectedVehicles.includes(vehicle.id)
      );
      
      onConfirm(assignedVehicles);
      onClose();
    } catch (err) {
      console.error('Error assigning vehicles:', err);
      setError('Failed to assign vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canAssignVehicles = selectedVehicles.length === requiredVehicles;

  const calculateCapacityFit = (vehicle: Vehicle) => {
    const vehicleVolume = vehicle.dimensions.length * vehicle.dimensions.width * vehicle.dimensions.height;
    const requestVolume = requestDimensions.total_length * requestDimensions.total_width * requestDimensions.total_height;
    
    const volumeFit = vehicleVolume >= requestVolume;
    const weightFit = vehicle.weight_capacity >= requestDimensions.total_weight;
    
    return {
      volumeFit,
      weightFit,
      overallFit: volumeFit && weightFit,
      volumeUtilization: Math.round((requestVolume / vehicleVolume) * 100),
      weightUtilization: Math.round((requestDimensions.total_weight / vehicle.weight_capacity) * 100)
    };
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10 transition-all">
                <div className="relative">
                  {/* Header */}
                  <div className="px-6 pt-6">
                    <div className="flex items-center justify-center relative">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white grid place-items-center shadow-md">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Assign Vehicles
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Select vehicles that can accommodate the request dimensions.
                          </Dialog.Description>
                        </div>
                      </div>
                      <button 
                        onClick={onClose} 
                        className="absolute right-0 p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    {/* Request Dimensions Summary */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Request Dimensions
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Ruler className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Length</span>
                          </div>
                          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {requestDimensions.total_length} {requestDimensions.unit}
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Ruler className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Width</span>
                          </div>
                          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {requestDimensions.total_width} {requestDimensions.unit}
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Ruler className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Height</span>
                          </div>
                          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {requestDimensions.total_height} {requestDimensions.unit}
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Weight className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Weight</span>
                          </div>
                          <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {requestDimensions.total_weight} kg
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                              Vehicle Selection Criteria
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              Vehicles must have sufficient capacity for both volume and weight. Green indicators show optimal fits.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Requirements */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck className="w-5 h-5 text-green-600" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Vehicle Assignment
                        </h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium rounded-full">
                          {requiredVehicles} Required
                        </span>
                      </div>

                      {/* Available Vehicles */}
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-green-500 mx-auto mb-4"></div>
                          <p className="text-gray-600 dark:text-gray-400">Loading available vehicles...</p>
                        </div>
                      ) : !Array.isArray(availableVehicles) || availableVehicles.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Available Vehicles
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The provider needs to add vehicles to their fleet before assigning them to jobs.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {Array.isArray(availableVehicles) && availableVehicles.map((vehicle) => {
                            const isSelected = selectedVehicles.includes(vehicle.id);
                            const isDisabled = !isSelected && selectedVehicles.length >= requiredVehicles;
                            const capacityFit = calculateCapacityFit(vehicle);
                            
                            return (
                              <div
                                key={vehicle.id}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : isDisabled
                                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                    : capacityFit.overallFit
                                    ? 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                                    : 'border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600'
                                }`}
                                onClick={() => !isDisabled && handleVehicleSelect(vehicle.id)}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center ${
                                      isSelected 
                                        ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                        : capacityFit.overallFit
                                        ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                                        : 'bg-gradient-to-br from-red-400 to-red-500'
                                    }`}>
                                      <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h5 className="font-semibold text-gray-900 dark:text-white">{vehicle.name}</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.type} • {vehicle.license_plate}</p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                      <span className="text-xs text-green-600 font-medium">Selected</span>
                                    </div>
                                  )}
                                </div>

                                {/* Vehicle Dimensions */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  <div className="text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Dimensions:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {vehicle.dimensions.length} × {vehicle.dimensions.width} × {vehicle.dimensions.height} {vehicle.dimensions.unit}
                                    </div>
                                  </div>
                                  <div className="text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Weight Capacity:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {vehicle.weight_capacity} kg
                                    </div>
                                  </div>
                                </div>

                                {/* Capacity Fit Indicators */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Volume Fit:</span>
                                    <div className="flex items-center gap-1">
                                      {capacityFit.volumeFit ? (
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                      )}
                                      <span className={capacityFit.volumeFit ? 'text-green-600' : 'text-red-600'}>
                                        {capacityFit.volumeUtilization}% utilized
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Weight Fit:</span>
                                    <div className="flex items-center gap-1">
                                      {capacityFit.weightFit ? (
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                      )}
                                      <span className={capacityFit.weightFit ? 'text-green-600' : 'text-red-600'}>
                                        {capacityFit.weightUtilization}% utilized
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Overall Fit Status */}
                                <div className={`mt-2 p-2 rounded text-xs text-center font-medium ${
                                  capacityFit.overallFit 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                  {capacityFit.overallFit ? '✓ Suitable for this request' : '⚠ Insufficient capacity'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Selection Status */}
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Selected: {selectedVehicles.length} / {requiredVehicles} vehicles
                            </span>
                            {selectedVehicles.length < requiredVehicles && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                ({requiredVehicles - selectedVehicles.length} more required)
                              </span>
                            )}
                          </div>
                          {selectedVehicles.length === requiredVehicles && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Ready to assign</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(selectedVehicles.length / requiredVehicles) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 pb-6 flex items-center justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignVehicles}
                      disabled={!canAssignVehicles || loading}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md shadow-green-600/20 flex items-center gap-2 transition ${
                        !canAssignVehicles || loading ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Assign Vehicles
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AssignVehiclesModal;
