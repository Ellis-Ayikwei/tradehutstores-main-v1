import React, { useState, useEffect } from 'react';
import { MapPin, Edit, Save, X, Plus, Trash2, Navigation, Map, Search } from 'lucide-react';
import AddressAutocomplete from '../../../../../../components/ui/AddressAutocomplete';
import { Provider } from '../../types';
import axiosInstance from '../../../../../../services/axiosInstance';
import showMessage from '../../../../../../helper/showMessage';
import showRequestError from '../../../../../../helper/showRequestError';

interface ServiceArea {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  is_primary: boolean;
}

interface BaseLocationData {
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface LocationTabProps {
  provider: Provider;
  onProviderUpdate?: () => void;
}

const LocationTab: React.FC<LocationTabProps> = ({ provider, onProviderUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(provider.service_radius_km || 0);
  const [acceptsInstantBookings, setAcceptsInstantBookings] = useState(provider.accepts_instant_bookings || false);
  const [baseLocation, setBaseLocation] = useState<BaseLocationData>(() => {
    try {
      return provider.base_location_data ? JSON.parse(provider.base_location_data) : { address: '' };
    } catch {
      return { address: provider.base_location_data || '' };
    }
  });
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaAddress, setNewAreaAddress] = useState('');
  const [newAreaPrimary, setNewAreaPrimary] = useState(false);

  // Initialize data from provider when component mounts or provider changes
  useEffect(() => {
    // Initialize base location from provider data
    if (provider.base_location_data) {
      try {
        const locationData = JSON.parse(provider.base_location_data);
        setBaseLocation(locationData);
      } catch (error) {
        console.error('Error parsing base_location_data:', error);
        setBaseLocation({ address: '' });
      }
    }

    // Initialize service areas from provider data
    if (provider.operating_areas) {
      // Check if it's already an array or needs to be parsed
      if (Array.isArray(provider.operating_areas)) {
        setServiceAreas(provider.operating_areas);
      } else {
        try {
          const areasData = JSON.parse(provider.operating_areas);
          setServiceAreas(Array.isArray(areasData) ? areasData : []);
        } catch (error) {
          console.error('Error parsing operating_areas:', error);
          setServiceAreas([]);
        }
      }
    }
  }, [provider.base_location_data, provider.operating_areas]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        service_radius_km: serviceRadius,
        accepts_instant_bookings: acceptsInstantBookings,
        base_location_data: JSON.stringify(baseLocation),
        base_location_lat: baseLocation.coordinates?.lat,
        base_location_lng: baseLocation.coordinates?.lng,
        operating_areas: serviceAreas.map(area => ({
          id: area.id,
          name: area.name,
          address: area.address,
          coordinates: area.coordinates,
          is_primary: area.is_primary
        }))
      };
      
      console.log('Sending location update payload:', payload);
      console.log('Base location coordinates:', baseLocation.coordinates);
      
      await axiosInstance.patch(`/providers/${provider.id}/update_location/`, payload);
      showMessage('Location settings updated successfully');
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
    setServiceRadius(provider.service_radius_km || 0);
    setAcceptsInstantBookings(provider.accepts_instant_bookings || false);
    
    // Reset base location from provider data
    if (provider.base_location_data) {
      try {
        const locationData = JSON.parse(provider.base_location_data);
        setBaseLocation(locationData);
      } catch (error) {
        console.error('Error parsing base_location_data:', error);
        setBaseLocation({ address: '' });
      }
    } else {
      setBaseLocation({ address: '' });
    }

    // Reset service areas from provider data
    if (provider.operating_areas) {
      // Check if it's already an array or needs to be parsed
      if (Array.isArray(provider.operating_areas)) {
        setServiceAreas(provider.operating_areas);
      } else {
        try {
          const areasData = JSON.parse(provider.operating_areas);
          setServiceAreas(Array.isArray(areasData) ? areasData : []);
        } catch (error) {
          console.error('Error parsing operating_areas:', error);
          setServiceAreas([]);
        }
      }
    } else {
      setServiceAreas([]);
    }
    
    setEditing(false);
  };

  const handleAddServiceArea = () => {
    if (!newAreaName.trim() || !newAreaAddress.trim()) return;
    
    const newArea: ServiceArea = {
      id: Date.now().toString(), // Temporary ID for new areas
      name: newAreaName.trim(),
      address: newAreaAddress.trim(),
      is_primary: newAreaPrimary
    };

    // If this is set as primary, unset all other primary areas
    if (newAreaPrimary) {
      setServiceAreas(prev => prev.map(area => ({ ...area, is_primary: false })));
    }

    setServiceAreas(prev => [...prev, newArea]);
    setNewAreaName('');
    setNewAreaAddress('');
    setNewAreaPrimary(false);
  };

  const handleRemoveServiceArea = (areaId: string) => {
    setServiceAreas(prev => prev.filter(area => area.id !== areaId));
  };

  const handleSetPrimary = (areaId: string) => {
    setServiceAreas(prev => prev.map(area => ({
      ...area,
      is_primary: area.id === areaId
    })));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Location & Service Areas
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage provider's service radius and operating areas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg shadow-sm hover:shadow-md disabled:shadow-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Edit className="w-4 h-4" />
              Edit Location
            </button>
          )}
        </div>
      </div>

      {/* Base Location */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Base Location
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Location Address
            </label>
            {editing ? (
              <div className="space-y-3">
                <AddressAutocomplete
                  value={baseLocation.address}
                  onAddressChange={(address: string) => setBaseLocation(prev => ({ ...prev, address }))}
                  onAddressSelect={(addressData) => setBaseLocation({ 
                    address: addressData.formatted_address, 
                    coordinates: addressData.coordinates 
                  })}
                  placeholder="Enter base location address..."
                  showDetails={false}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This is the primary location where the provider operates from
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 dark:text-white">
                    {baseLocation.address || 'No base location set'}
                  </p>
                  {!baseLocation.address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Base location helps customers understand your service area
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Radius & Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Service Settings
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Radius (km)
            </label>
            {editing ? (
              <input
                type="number"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                min="0"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{serviceRadius} km</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accepts Instant Bookings
            </label>
            {editing ? (
              <select
                value={acceptsInstantBookings ? 'true' : 'false'}
                onChange={(e) => setAcceptsInstantBookings(e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <p className="text-gray-900 dark:text-white">
                {acceptsInstantBookings ? 'Yes' : 'No'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Service Areas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Areas
          </h4>
          {editing && (
            <button
              onClick={() => {
                setNewAreaName('');
                setNewAreaPrimary(false);
                // You could open a modal here instead
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Area
            </button>
          )}
        </div>

        {serviceAreas.length > 0 ? (
          <div className="space-y-3">
            {serviceAreas.map((area) => (
              <div key={area.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{area.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{area.address}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {area.is_primary && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Primary
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {editing && (
                  <div className="flex items-center gap-2">
                    {!area.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(area.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveServiceArea(area.id)}
                      className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      title="Remove service area"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No service areas defined</p>
            {editing && (
              <p className="text-sm text-gray-400 mt-2">
                Add service areas to define where this provider operates
              </p>
            )}
          </div>
        )}

        {/* Add New Area Form */}
        {editing && (
          <div className="mt-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Add New Service Area</h5>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Area Name
                  </label>
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="e.g., Central London"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Area Address
                </label>
                <AddressAutocomplete
                  value={newAreaAddress}
                  onAddressChange={(address: string) => setNewAreaAddress(address)}
                  onAddressSelect={(addressData) => setNewAreaAddress(addressData.formatted_address)}
                  placeholder="Enter service area address..."
                  className="w-full"
                  showDetails={false}
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newAreaPrimary}
                    onChange={(e) => setNewAreaPrimary(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Primary Area</span>
                </label>
              </div>
            </div>
            <button
              onClick={handleAddServiceArea}
              disabled={!newAreaName.trim() || !newAreaAddress.trim()}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg shadow-sm hover:shadow-md disabled:shadow-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Service Area
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationTab;
