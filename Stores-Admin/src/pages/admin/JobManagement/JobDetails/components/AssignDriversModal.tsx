import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  AlertCircle, 
  X, 
  UserPlus, 
  Users,
  User,
  AlertTriangle,
  CheckCircle,
  Save
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  is_available: boolean;
  rating: number;
  experience_years: number;
}

interface AssignDriversModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedDrivers: Driver[]) => void;
  job: any;
  providerId: string;
  requiredDrivers: number;
  currentlyAssigned?: Driver[];
}

const AssignDriversModal: React.FC<AssignDriversModalProps> = ({ 
  open, 
  onClose, 
  onConfirm,
  job,
  providerId,
  requiredDrivers,
  currentlyAssigned = []
}) => {
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected drivers with currently assigned ones
  useEffect(() => {
    if (currentlyAssigned.length > 0) {
      setSelectedDrivers(currentlyAssigned.map(driver => driver.id));
    }
  }, [currentlyAssigned]);

  // Fetch available drivers
  useEffect(() => {
    if (open && providerId) {
      fetchAvailableDrivers();
    }
  }, [open, providerId]);

  const fetchAvailableDrivers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/providers/${providerId}/available_drivers/`);
      const drivers = Array.isArray(response.data) ? response.data : [];
      setAvailableDrivers(drivers);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError('Failed to load available drivers');
      setAvailableDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelect = (driverId: string) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId);
      } else {
        if (prev.length < requiredDrivers) {
          return [...prev, driverId];
        }
        return [...prev.slice(0, requiredDrivers - 1), driverId];
      }
    });
  };

  const handleAssignDrivers = async () => {
    if (selectedDrivers.length !== requiredDrivers) {
      setError(`Please select exactly ${requiredDrivers} driver(s)`);
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post(`/jobs/${job.id}/assign_staffs/`, {
        staff_ids: selectedDrivers,
        provider_id: providerId
      });
      
      // Get the selected driver objects
      const assignedDrivers = availableDrivers.filter(driver => 
        selectedDrivers.includes(driver.id)
      );
      
      onConfirm(assignedDrivers);
      onClose();
    } catch (err) {
      console.error('Error assigning drivers:', err);
      setError('Failed to assign drivers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canAssignDrivers = selectedDrivers.length === requiredDrivers;

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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10 transition-all">
                <div className="relative">
                  {/* Header */}
                  <div className="px-6 pt-6">
                    <div className="flex items-center justify-center relative">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center shadow-md">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Assign Drivers
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Select drivers for this job assignment.
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
                    {/* Driver Requirements */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {currentlyAssigned.length > 0 ? 'Manage Drivers' : 'Driver Assignment'}
                        </h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium rounded-full">
                          {requiredDrivers} Required
                        </span>
                      </div>

                      {requiredDrivers && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                This job requires {requiredDrivers} driver(s)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Currently Assigned Drivers - Show in Manage Mode */}
                      {currentlyAssigned.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Currently Assigned Drivers
                            </h4>
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium rounded-full">
                              {currentlyAssigned.length} Assigned
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentlyAssigned.map((driver) => {
                              const isSelected = selectedDrivers.includes(driver.id);
                              
                              return (
                                <div
                                  key={driver.id}
                                  className={`p-4 rounded-lg border-2 transition-all ${
                                    isSelected
                                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                      : 'border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                                  }`}
                                  onClick={() => handleDriverSelect(driver.id)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center ${
                                        isSelected 
                                          ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                          : 'bg-gradient-to-br from-green-400 to-green-500'
                                      }`}>
                                        <User className="w-5 h-5" />
                                      </div>
                                      <div className='flex flex-col justify-center items-start gap-1'>
                                        <h5 className="font-semibold text-gray-900 dark:text-white">{driver.name}</h5>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{driver.email}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">{driver.phone}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {isSelected ? (
                                        <>
                                          <CheckCircle className="w-5 h-5 text-green-600" />
                                          <span className="text-xs text-green-600 font-medium">Selected</span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="w-5 h-5 rounded-full border-2 border-green-300"></div>
                                          <span className="text-xs text-green-600 font-medium">Assigned</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                                Click on assigned drivers to keep or remove them from this job
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Available Drivers */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <UserPlus className="w-5 h-5 text-blue-600" />
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {currentlyAssigned.length > 0 ? 'Additional Available Drivers' : 'Available Drivers'}
                          </h4>
                        </div>
                      </div>
                      
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500 mx-auto mb-4"></div>
                          <p className="text-gray-600 dark:text-gray-400">Loading available drivers...</p>
                        </div>
                      ) : !Array.isArray(availableDrivers) || availableDrivers.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Available Drivers
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The provider needs to add drivers to their team before assigning them to jobs.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.isArray(availableDrivers) && availableDrivers.map((driver) => {
                            const isSelected = selectedDrivers.includes(driver.id);
                            const isDisabled = !isSelected && selectedDrivers.length >= requiredDrivers;
                            
                            return (
                              <div
                                key={driver.id}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : isDisabled
                                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                                onClick={() => !isDisabled && handleDriverSelect(driver.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center ${
                                      isSelected 
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                    }`}>
                                      <User className="w-5 h-5" />
                                    </div>
                                    <div className='flex flex-col justify-center items-center gap-1'>
                                      <h5 className="font-semibold text-gray-900 dark:text-white">{driver.name}</h5>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{driver.email}</p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="w-5 h-5 text-blue-600" />
                                      <span className="text-xs text-blue-600 font-medium">Selected</span>
                                    </div>
                                  )}
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
                              Selected: {selectedDrivers.length} / {requiredDrivers} drivers
                            </span>
                            {selectedDrivers.length < requiredDrivers && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                ({requiredDrivers - selectedDrivers.length} more required)
                              </span>
                            )}
                            {currentlyAssigned.length > 0 && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                (Currently: {currentlyAssigned.length} assigned)
                              </span>
                            )}
                          </div>
                          {selectedDrivers.length === requiredDrivers && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {currentlyAssigned.length > 0 ? 'Ready to update' : 'Ready to assign'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(selectedDrivers.length / requiredDrivers) * 100}%` }}
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
                      onClick={handleAssignDrivers}
                      disabled={!canAssignDrivers || loading}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 flex items-center gap-2 transition ${
                        !canAssignDrivers || loading ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          {currentlyAssigned.length > 0 ? 'Updating...' : 'Assigning...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {currentlyAssigned.length > 0 ? 'Update Drivers' : 'Assign Drivers'}
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

export default AssignDriversModal;
