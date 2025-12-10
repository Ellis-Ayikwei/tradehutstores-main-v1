import React, { useState } from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { IconMapPin, IconPlus, IconEdit, IconTrash, IconX, IconUser, IconPhone } from '@tabler/icons-react';
import AddressAutocomplete from '../../../../components/AddressAutocomplete';

interface Location {
    id: string;
    address: string;
    postcode: string;
    city: string;
    country: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    contact_name?: string;
    contact_phone?: string;
    access_instructions?: string;
    type?: string; // Added for API compatibility
    use_main_contact?: boolean; // Use customer details from request
}

interface RequestLocationsTabProps {
    pickupLocations: Location[];
    setPickupLocations: (locations: Location[]) => void;
    dropoffLocations: Location[];
    setDropoffLocations: (locations: Location[]) => void;
    locations: any;
    isEditing: boolean;
    saving?: boolean;
    hasChanges?: boolean;
    onSaveTab?: () => void;
    onCancelTab?: () => void;
    requestId?: string;
    onRefetch?: () => void;
    setIsEditing?: (v: boolean) => void;
    requestType?: string;
    requestData?: {
        contact_name?: string;
        contact_phone?: string;
        contact_email?: string;
        estimated_distance?: number;
    };
}

const RequestLocationsTab: React.FC<RequestLocationsTabProps> = ({
    pickupLocations,
    setPickupLocations,
    dropoffLocations,
    setDropoffLocations,
    locations,
    isEditing,
    saving = false,
    hasChanges = false,
    onSaveTab = () => {},
    onCancelTab = () => {},
    requestId,
    onRefetch = () => {},
    setIsEditing = () => {},
    requestType = '',
    requestData
}) => {
    const isInstant = requestType === 'instant';
    const canAddPickup = !isInstant || pickupLocations.length < 1;
    const canAddDropoff = !isInstant || dropoffLocations.length < 1;
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [locationType, setLocationType] = useState<'pickup' | 'dropoff'>('pickup');
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [newLocation, setNewLocation] = useState<Partial<Location>>({
        address: '',
        postcode: '',
        city: '',
        country: 'UK',
        contact_name: '',
        contact_phone: '',
        access_instructions: ''
    });

    const handleAddLocation = () => {
        if (!newLocation.address) return;

        // Enforce instant request limit
        if (isInstant) {
            if (locationType === 'pickup' && pickupLocations.length >= 1) {
                showMessage('Instant requests can only have one pickup location', 'warning');
                return;
            }
            if (locationType === 'dropoff' && dropoffLocations.length >= 1) {
                showMessage('Instant requests can only have one dropoff location', 'warning');
                return;
            }
        }

        const location: Location = {
            id: Date.now().toString(),
            address: newLocation.address!,
            postcode: newLocation.postcode!,
            city: newLocation.city!,
            country: newLocation.country || 'UK',
            contact_name: newLocation.use_main_contact ? undefined : newLocation.contact_name,
            contact_phone: newLocation.use_main_contact ? undefined : newLocation.contact_phone,
            access_instructions: newLocation.access_instructions,
            coordinates: newLocation.coordinates,
            use_main_contact: newLocation.use_main_contact ?? false
        };

        if (locationType === 'pickup') {
            setPickupLocations([...pickupLocations, location]);
        } else {
            setDropoffLocations([...dropoffLocations, location]);
        }

        setNewLocation({
            address: '',
            postcode: '',
            city: '',
            country: 'UK',
            contact_name: '',
            contact_phone: '',
            access_instructions: '',
            use_main_contact: false
        });
        setShowAddLocation(false);
    };

    const handleEditLocation = (location: Location, type: 'pickup' | 'dropoff') => {
        setEditingLocation(location);
        setLocationType(type);
        // If location doesn't have use_main_contact flag but has no contact info, set it to true
        const useMainContact = location.use_main_contact ?? (!location.contact_name && !location.contact_phone && !!(requestData?.contact_name || requestData?.contact_phone));
        setNewLocation({
            ...location,
            use_main_contact: useMainContact
        });
        setShowAddLocation(true);
    };

    const handleUpdateLocation = () => {
        if (!editingLocation || !newLocation.address) return;

        const updatedLocation: Location = {
            ...editingLocation,
            address: newLocation.address!,
            postcode: newLocation.postcode!,
            city: newLocation.city!,
            country: newLocation.country || 'UK',
            contact_name: newLocation.use_main_contact ? undefined : newLocation.contact_name,
            contact_phone: newLocation.use_main_contact ? undefined : newLocation.contact_phone,
            access_instructions: newLocation.access_instructions,
            coordinates: newLocation.coordinates || editingLocation.coordinates,
            use_main_contact: newLocation.use_main_contact ?? false
        };

        if (locationType === 'pickup') {
            setPickupLocations(pickupLocations.map(loc => 
                loc.id === editingLocation.id ? updatedLocation : loc
            ));
        } else {
            setDropoffLocations(dropoffLocations.map(loc => 
                loc.id === editingLocation.id ? updatedLocation : loc
            ));
        }

        setEditingLocation(null);
        setNewLocation({
            address: '',
            postcode: '',
            city: '',
            country: 'UK',
            contact_name: '',
            contact_phone: '',
            access_instructions: '',
            use_main_contact: false
        });
        setShowAddLocation(false);
    };

    const handleDeleteLocation = (locationId: string, type: 'pickup' | 'dropoff') => {
        if (type === 'pickup') {
            setPickupLocations(pickupLocations.filter(loc => loc.id !== locationId));
        } else {
            setDropoffLocations(dropoffLocations.filter(loc => loc.id !== locationId));
        }
    };

    const handleAddressSelect = (addressData: {
        formatted_address: string;
        coordinates: { lat: number; lng: number };
        components: {
            address_line1: string;
            city: string;
            county: string;
            postcode: string;
            country: string;
        };
    }) => {
        // Extract components safely
        const components = addressData?.components || {};
        
        // Normalize country name
        let country = components.country || 'UK';
        if (country && (country.toLowerCase().includes('united kingdom') || country.toLowerCase().includes('uk'))) {
            country = 'UK';
        }
        
        // Get city, prefer city over county
        const city = components.city || components.county || '';
        
        // Get postcode
        const postcode = components.postcode || '';
        
        // Get formatted address
        const formattedAddress = addressData?.formatted_address || '';
        
        // Explicitly update all location fields from the selected address
        // This ensures all fields are populated when an address is selected
        // Preserve contact fields that were pre-filled from customer details
        setNewLocation(prev => ({
            ...prev,
            address: formattedAddress || prev.address || '',
            postcode: postcode || prev.postcode || '',
            city: city || prev.city || '',
            country: country || prev.country || 'UK',
            coordinates: addressData?.coordinates || prev.coordinates
            // Note: contact_name and contact_phone are preserved from previous state
        }));
    };

    const LocationCard: React.FC<{ location: Location; type: 'pickup' | 'dropoff' }> = ({ location, type }) => {
        const typeColor = type === 'pickup' ? 'green' : 'blue';
        const typeBg = type === 'pickup' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        
        return (
            <div className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-5 transition-all duration-200 hover:shadow-lg ${typeBg}`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                            type === 'pickup' 
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' 
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        }`}>
                            <IconMapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                                type === 'pickup' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                                {type === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}
                            </span>
                        </div>
                    </div>
                    {isEditing && (
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => handleEditLocation(location, type)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Edit location"
                            >
                                <IconEdit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteLocation(location.id, type)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Delete location"
                            >
                                <IconTrash className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {/* Address Section */}
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-base mb-1 leading-tight">
                            {location.address}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <IconMapPin className="w-4 h-4 text-gray-400" />
                            <span>{location.postcode || 'No postcode'}</span>
                            {location.postcode && location.city && <span>•</span>}
                            {location.city && <span>{location.city}</span>}
                            {location.city && location.country && <span>•</span>}
                            {location.country && <span>{location.country}</span>}
                        </div>
                    </div>

                    {/* Coordinates - Verified Badge */}
                    {location.coordinates && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                Verified Location
                            </span>
                            <span className="text-xs text-green-600 dark:text-green-500 ml-auto">
                                {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
                            </span>
                        </div>
                    )}

                    {/* Contact Information */}
                    {(location.contact_name || location.contact_phone) && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                            {location.contact_name && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-700">
                                        <IconUser className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{location.contact_name}</span>
                                </div>
                            )}
                            {location.contact_phone && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-700">
                                        <IconPhone className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <a 
                                        href={`tel:${location.contact_phone}`}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                                    >
                                        {location.contact_phone}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Access Instructions */}
                    {location.access_instructions && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-2">
                                <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/30 mt-0.5">
                                    <IconMapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                                        Access Instructions
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {location.access_instructions}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleSave = async () => {
        if (!requestId) return;
        try {
            const journeyStops = [
                ...pickupLocations.map((loc, index) => ({
                    type: 'pickup',
                    sequence: index,
                    location: {
                        address: loc.address,
                        address_line1: loc.address,
                        city: loc.city,
                        postcode: loc.postcode,
                        county: loc.city || '',
                        country: loc.country || 'UK',
                        latitude: loc.coordinates?.lat || null,
                        longitude: loc.coordinates?.lng || null,
                        // Only send contact fields if NOT using main contact
                        contact_name: loc.use_main_contact ? '' : (loc.contact_name || ''),
                        contact_phone: loc.use_main_contact ? '' : (loc.contact_phone || ''),
                        use_main_contact: loc.use_main_contact ?? (!loc.contact_name && !loc.contact_phone),
                        special_instructions: loc.access_instructions || ''
                    }
                })),
                ...dropoffLocations.map((loc, index) => ({
                    type: 'dropoff',
                    sequence: pickupLocations.length + index,
                    location: {
                        address: loc.address,
                        address_line1: loc.address,
                        city: loc.city,
                        postcode: loc.postcode,
                        county: loc.city || '',
                        country: loc.country || 'UK',
                        latitude: loc.coordinates?.lat || null,
                        longitude: loc.coordinates?.lng || null,
                        // Only send contact fields if NOT using main contact
                        contact_name: loc.use_main_contact ? '' : (loc.contact_name || ''),
                        contact_phone: loc.use_main_contact ? '' : (loc.contact_phone || ''),
                        use_main_contact: loc.use_main_contact ?? (!loc.contact_name && !loc.contact_phone),
                        special_instructions: loc.access_instructions || ''
                    }
                }))
            ];
            await axiosInstance.patch(`/instant-requests/${requestId}/update-locations/`, { journey_stops: journeyStops });
            showMessage('Locations updated');
            onRefetch();
            setIsEditing(false);
        } catch (error) {
            showRequestError(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Locations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage pickup and dropoff locations for this request
                    </p>
                 
                </div>
                <div className="flex items-center space-x-2">
                    {isEditing && (
                        <>
                            <button
                                onClick={() => {
                                    if (!canAddPickup) return;
                                    setLocationType('pickup');
                                    // Pre-fill contact fields from customer details
                                    // Default to using main contact if customer data is available
                                    setNewLocation({
                                        address: '',
                                        postcode: '',
                                        city: '',
                                        country: 'UK',
                                        contact_name: '',
                                        contact_phone: '',
                                        access_instructions: '',
                                        use_main_contact: !!(requestData?.contact_name || requestData?.contact_phone)
                                    });
                                    setShowAddLocation(true);
                                }}
                                disabled={!canAddPickup}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    canAddPickup
                                        ? 'text-white bg-green-600 hover:bg-green-700'
                                        : 'text-gray-400 bg-gray-300 cursor-not-allowed'
                                }`}
                                title={!canAddPickup ? 'Instant requests can only have one pickup location' : 'Add pickup location'}
                            >
                                <IconPlus className="w-4 h-4" />
                                Add Pickup
                            </button>
                            <button
                                onClick={() => {
                                    if (!canAddDropoff) return;
                                    setLocationType('dropoff');
                                    // Pre-fill contact fields from customer details
                                    // Default to using main contact if customer data is available
                                    setNewLocation({
                                        address: '',
                                        postcode: '',
                                        city: '',
                                        country: 'UK',
                                        contact_name: '',
                                        contact_phone: '',
                                        access_instructions: '',
                                        use_main_contact: !!(requestData?.contact_name || requestData?.contact_phone)
                                    });
                                    setShowAddLocation(true);
                                }}
                                disabled={!canAddDropoff}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    canAddDropoff
                                        ? 'text-white bg-blue-600 hover:bg-blue-700'
                                        : 'text-gray-400 bg-gray-300 cursor-not-allowed'
                                }`}
                                title={!canAddDropoff ? 'Instant requests can only have one dropoff location' : 'Add dropoff location'}
                            >
                                <IconPlus className="w-4 h-4" />
                                Add Dropoff
                            </button>
                        </>
                    )}
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { onCancelTab(); }}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                                className={`px-3 py-2 text-sm font-medium rounded-lg ${hasChanges ? 'text-white bg-green-600 hover:bg-green-700' : 'text-gray-400 bg-gray-300 cursor-not-allowed'}`}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Pickup Locations */}
            <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconMapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Pickup Locations ({pickupLocations.length})
                </h4>
                {pickupLocations.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                        <IconMapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No pickup locations added</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pickupLocations.map((location) => (
                            <LocationCard key={location.id} location={location} type="pickup" />
                        ))}
                    </div>
                )}
            </div>

            {/* Dropoff Locations */}
            <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <IconMapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Dropoff Locations ({dropoffLocations.length})
                </h4>
                {dropoffLocations.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                        <IconMapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No dropoff locations added</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dropoffLocations.map((location) => (
                            <LocationCard key={location.id} location={location} type="dropoff" />
                        ))}
                    </div>
                )}
            </div>

            {/* Route Information */}
            {requestData?.estimated_distance !== undefined && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <IconMapPin className="w-5 h-5 text-gray-400" />
                        Route Information
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Estimated Distance (km)
                        </label>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {requestData?.estimated_distance || '0.00'} km
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Calculated based on the route between pickup and dropoff locations
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Location Modal */}
            {showAddLocation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className={`px-6 py-4 border-b ${
                            locationType === 'pickup' 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                        locationType === 'pickup'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    }`}>
                                        <IconMapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {editingLocation ? 'Edit Location' : `Add ${locationType === 'pickup' ? 'Pickup' : 'Dropoff'} Location`}
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            {editingLocation ? 'Update location details' : 'Search for a verified address or enter manually'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAddLocation(false);
                                        setEditingLocation(null);
                                        setNewLocation({
                                            address: '',
                                            postcode: '',
                                            city: '',
                                            country: 'UK',
                                            contact_name: '',
                                            contact_phone: '',
                                            access_instructions: ''
                                        });
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <IconX className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Address Search Section */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <IconMapPin className="w-4 h-4" />
                                        Address *
                                    </label>
                                    <AddressAutocomplete
                                        placeholder="Search for a verified address..."
                                        onAddressSelect={handleAddressSelect}
                                        value={newLocation.address || ''}
                                        onAddressChange={(value) => setNewLocation(prev => ({ ...prev, address: value }))}
                                        showDetails={false}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                        Start typing to search for verified addresses. Fields below will auto-fill but can be edited.
                                    </p>
                                </div>

                                {/* Location Details Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-blue-500 rounded"></div>
                                        Location Details
                                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(All fields editable)</span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Postcode
                                            </label>
                                            <input
                                                type="text"
                                                value={newLocation.postcode || ''}
                                                onChange={(e) => setNewLocation(prev => ({ ...prev, postcode: e.target.value }))}
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                placeholder="e.g., SW1A 1AA"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={newLocation.city || ''}
                                                onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                placeholder="e.g., London"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                value={newLocation.country || ''}
                                                onChange={(e) => setNewLocation(prev => ({ ...prev, country: e.target.value }))}
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                placeholder="e.g., UK"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-blue-500 rounded"></div>
                                        Contact Information
                                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                                    </h4>
                                    
                                    {/* Same as Customer Details Checkbox */}
                                    {requestData?.contact_name || requestData?.contact_phone ? (
                                        <div className="mb-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newLocation.use_main_contact ?? true}
                                                    onChange={(e) => setNewLocation(prev => ({
                                                        ...prev,
                                                        use_main_contact: e.target.checked,
                                                        // Clear contact fields when using main contact
                                                        contact_name: e.target.checked ? '' : (prev.contact_name || requestData?.contact_name || ''),
                                                        contact_phone: e.target.checked ? '' : (prev.contact_phone || requestData?.contact_phone || '')
                                                    }))}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Same as customer details
                                                </span>
                                            </label>
                                            {newLocation.use_main_contact && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
                                                    Will use {requestData?.contact_name || 'customer'} ({requestData?.contact_phone || 'customer phone'}) from request details
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                    
                                    {/* Contact Fields - Only show when NOT using main contact */}
                                    {!newLocation.use_main_contact && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                    <IconUser className="w-4 h-4" />
                                                    Contact Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newLocation.contact_name || ''}
                                                    onChange={(e) => setNewLocation(prev => ({ ...prev, contact_name: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder={requestData?.contact_name || "Contact person name"}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                    <IconPhone className="w-4 h-4" />
                                                    Contact Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={newLocation.contact_phone || ''}
                                                    onChange={(e) => setNewLocation(prev => ({ ...prev, contact_phone: e.target.value }))}
                                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder={requestData?.contact_phone || "+44 123 456 7890"}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Access Instructions Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-amber-500 rounded"></div>
                                        Additional Information
                                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Access Instructions
                                        </label>
                                        <textarea
                                            value={newLocation.access_instructions || ''}
                                            onChange={(e) => setNewLocation({ ...newLocation, access_instructions: e.target.value })}
                                            rows={4}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                            placeholder="Any special access instructions, codes, parking information, or notes for drivers..."
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Help drivers find and access this location more easily
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowAddLocation(false);
                                    setEditingLocation(null);
                                    setNewLocation({
                                        address: '',
                                        postcode: '',
                                        city: '',
                                        country: 'UK',
                                        contact_name: '',
                                        contact_phone: '',
                                        access_instructions: ''
                                    });
                                }}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingLocation ? handleUpdateLocation : handleAddLocation}
                                disabled={!newLocation.address}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    newLocation.address
                                        ? locationType === 'pickup'
                                            ? 'text-white bg-green-600 hover:bg-green-700 shadow-sm hover:shadow-md'
                                            : 'text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md'
                                        : 'text-gray-400 bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                }`}
                            >
                                {editingLocation ? 'Update Location' : `Add ${locationType === 'pickup' ? 'Pickup' : 'Dropoff'} Location`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestLocationsTab;
