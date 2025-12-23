import React, { useState, useEffect } from 'react';
import { Truck, Edit, Save, X, Plus, Trash2, Tag, DollarSign, Settings } from 'lucide-react';
import { Provider } from '../../types';
import axiosInstance from '../../../../../../services/axiosInstance';
import showMessage from '../../../../../../helper/showMessage';
import showRequestError from '../../../../../../helper/showRequestError';

interface Service {
  id: string;
  name: string;
  description?: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  services: Service[];
}

interface ServicesTabProps {
  provider: Provider;
  onProviderUpdate?: () => void;
}

const ServicesTab: React.FC<ServicesTabProps> = ({ provider, onProviderUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<ServiceCategory[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState(Number(provider.hourly_rate) || 0);
  const [minimumJobValue, setMinimumJobValue] = useState(Number(provider.minimum_job_value) || 0);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    fetchAvailableCategories();
  }, []);

  // Initialize selected services when available categories are loaded
  useEffect(() => {
    if (availableCategories.length > 0 && provider.services_offered) {
      // Extract IDs from service objects
      const serviceIds = provider.services_offered.map((service: any) => 
        typeof service === 'string' ? service : service.id
      );
      setSelectedServices(serviceIds);
    }
  }, [availableCategories, provider.services_offered]);

  const fetchAvailableCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await axiosInstance.get('/service-categories/');
      const categories = response.data.results || response.data || [];
      
      // Fetch services for each category
      const categoriesWithServices = await Promise.all(
        categories.map(async (category: any) => {
          try {
            const servicesResponse = await axiosInstance.get(`/service-categories/${category.id}/services/`);
            return {
              ...category,
              services: servicesResponse.data.results || servicesResponse.data || []
            };
          } catch (error) {
            console.error(`Error fetching services for category ${category.id}:`, error);
            return {
              ...category,
              services: []
            };
          }
        })
      );
      
      setAvailableCategories(categoriesWithServices);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showRequestError(error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axiosInstance.patch(`/providers/${provider.id}/update_services/`, {
        services_offered: selectedServices,
        hourly_rate: hourlyRate,
        minimum_job_value: minimumJobValue
      });
      showMessage('Services updated successfully');
      setEditing(false);
      // Refresh provider data
      if (onProviderUpdate) {
        onProviderUpdate();
      }
    } catch (error) {
      showRequestError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setHourlyRate(Number(provider.hourly_rate) || 0);
    setMinimumJobValue(Number(provider.minimum_job_value) || 0);
    // Extract IDs from service objects
    const serviceIds = provider.services_offered?.map((service: any) => 
      typeof service === 'string' ? service : service.id
    ) || [];
    setSelectedServices(serviceIds);
    setEditing(false);
  };

  const handleServiceToggle = (serviceId: string) => {
    const isSelected = selectedServices.includes(serviceId);
    if (isSelected) {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    } else {
      setSelectedServices(prev => [...prev, serviceId]);
    }
  };

  const handleSelectAll = () => {
    const allServiceIds = availableCategories.flatMap(category => 
      category.services.map(service => service.id)
    );
    setSelectedServices(allServiceIds);
  };

  const handleDeselectAll = () => {
    setSelectedServices([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Truck className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Services & Categories
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage provider's service categories and pricing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Services
            </button>
          )}
        </div>
      </div>

      {/* Service Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Categories
          </h4>
          {editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm"
              >
                Deselect All
              </button>
            </div>
          )}
        </div>

        {loadingCategories ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : availableCategories.length > 0 ? (
          <div className="space-y-4">
            {/* Header showing current selection */}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {selectedServices.length} services selected
                </span>
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {/* Services by Category */}
            <div className="space-y-6">
              {availableCategories.map((category) => (
                <div key={category.id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {category.services.length} services available
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Services List */}
                  <div className="p-4">
                    {category.services.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.services.map((service) => {
                          const isSelected = selectedServices.includes(service.id);
                          const isCurrentlyAssigned = provider.services_offered?.includes(service.id);
                          
                          return (
                            <div
                              key={service.id}
                              className={`p-3 border rounded-lg transition-colors ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : isCurrentlyAssigned && !editing
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              } ${editing ? 'cursor-pointer' : 'cursor-default'}`}
                              onClick={() => editing && handleServiceToggle(service.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${
                                  isSelected 
                                    ? 'bg-green-100 dark:bg-green-900/30' 
                                    : isCurrentlyAssigned && !editing
                                    ? 'bg-blue-100 dark:bg-blue-900/30'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                  <Truck className={`w-3 h-3 ${
                                    isSelected 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : isCurrentlyAssigned && !editing
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <p className={`font-medium text-sm ${
                                    isSelected 
                                      ? 'text-green-900 dark:text-green-100' 
                                      : isCurrentlyAssigned && !editing
                                      ? 'text-blue-900 dark:text-blue-100'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {service.name}
                                  </p>
                                  {service.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {service.description}
                                    </p>
                                  )}
                                  {isCurrentlyAssigned && !editing && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                      Currently assigned
                                    </p>
                                  )}
                                </div>
                                {editing && (
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected
                                      ? 'border-green-500 bg-green-500'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No services available in this category</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No service categories available</p>
          </div>
        )}

        {selectedServices.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>{selectedServices.length}</strong> services selected
            </p>
          </div>
        )}
      </div>

      {/* Pricing Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pricing Settings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hourly Rate (£)
            </label>
            {editing ? (
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <p className="text-gray-900 dark:text-white">£{(Number(hourlyRate) || 0).toFixed(2)}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Job Value (£)
            </label>
            {editing ? (
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={minimumJobValue}
                  onChange={(e) => setMinimumJobValue(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <p className="text-gray-900 dark:text-white">£{(Number(minimumJobValue) || 0).toFixed(2)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Current Services Summary */}
      {selectedServices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Selected Services
          </h4>
          <div className="space-y-4">
            {availableCategories.map((category) => {
              const categoryServices = category.services.filter(service => 
                selectedServices.includes(service.id)
              );
              
              if (categoryServices.length === 0) return null;
              
              return (
                <div key={category.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {category.name}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categoryServices.map((service) => (
                      <div key={service.id} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Truck className="w-3 h-3 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">{service.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesTab;
