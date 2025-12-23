import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Users, Loader2, UserCheck, Star, Phone, Mail, MapPin, Calendar, Award, Clock, CheckCircle, Truck } from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';

interface ProviderInterest {
    id: string;
    provider_id: string;
    provider_name: string;
    expressed_at: string;
}

interface ProviderDetail {
    id: string;
    average_rating?: number;
    completed_bookings_count?: number;
    vehicle_count?: number;
    service_radius_km?: number;
    verification_status?: string;
    contact_person_phone?: string;
    contact_person_email?: string;
    hourly_rate?: number;
    accepts_instant_bookings?: boolean;
    service_categories?: Array<{ name: string } | string>;
    specializations?: Array<{ name: string } | string>;
    base_location_data?: {
        address?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
        formatted_address?: string;
        city?: string;
        postcode?: string;
        country?: string;
    };
    addresses?: Array<{
        id: string;
        address_type: string;
        address_line_1: string;
        address_line_2?: string;
        city: string;
        postcode: string;
        state?: string;
        country: string;
        business_name?: string;
        is_primary: boolean;
        is_verified: boolean;
    }>;
}

interface InterestedProvidersModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    onAssignProvider: (providerId: string) => void;
}

const InterestedProvidersModal: React.FC<InterestedProvidersModalProps> = ({
    isOpen,
    onClose,
    jobId,
    onAssignProvider
}) => {
    const [interestedProviders, setInterestedProviders] = useState<ProviderInterest[]>([]);
    const [loadingInterestedProviders, setLoadingInterestedProviders] = useState(false);
    const [providerDetails, setProviderDetails] = useState<Record<string, ProviderDetail>>({});

    // Helper function to format location data
    const formatLocationData = (providerDetail: ProviderDetail): string => {
        // Try base_location_data first
        if (providerDetail.base_location_data?.formatted_address) {
            return providerDetail.base_location_data.formatted_address;
        }
        
        if (providerDetail.base_location_data?.address) {
            return providerDetail.base_location_data.address;
        }

        // Try addresses array - find primary address
        if (providerDetail.addresses && providerDetail.addresses.length > 0) {
            const primaryAddress = providerDetail.addresses.find(addr => addr.is_primary) || providerDetail.addresses[0];
            const parts = [
                primaryAddress.address_line_1,
                primaryAddress.address_line_2,
                primaryAddress.city,
                primaryAddress.postcode,
                primaryAddress.country
            ].filter(Boolean);
            
            return parts.join(', ');
        }

        return 'Location not specified';
    };

    // Helper function to get coordinates for mapping
    const getCoordinates = (providerDetail: ProviderDetail): { lat: number; lng: number } | null => {
        if (providerDetail.base_location_data?.coordinates) {
            return providerDetail.base_location_data.coordinates;
        }
        return null;
    };

    // Fetch detailed provider information
    const fetchProviderDetails = async (providerId: string) => {
        try {
            const response = await axiosInstance.get(`/providers/${providerId}/`);
            if (response.status === 200) {
                setProviderDetails(prev => ({
                    ...prev,
                    [providerId]: response.data
                }));
            }
        } catch (error) {
            console.error('Error fetching provider details:', error);
        }
    };

    // Fetch interested providers
    const fetchInterestedProviders = async () => {
        if (!jobId) return;
        
        try {
            setLoadingInterestedProviders(true);
            const response = await axiosInstance.get(`/jobs/${jobId}/interested_providers/`);
            
            if (response.status === 200) {
                const providers = response.data.data || [];
                setInterestedProviders(providers);
                
                // Fetch detailed information for each provider
                providers.forEach((provider: ProviderInterest) => {
                    fetchProviderDetails(provider.provider_id);
                });
            }
        } catch (error) {
            console.error('Error loading interested providers:', error);
        } finally {
            setLoadingInterestedProviders(false);
        }
    };

    // Reset state when modal closes
    const handleClose = () => {
        setInterestedProviders([]);
        setProviderDetails({});
        onClose();
    };

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen && jobId) {
            fetchInterestedProviders();
        }
    }, [isOpen, jobId]);

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center gap-2"
                                    >
                                        <Users className="w-5 h-5" />
                                        Interested Providers
                                    </Dialog.Title>
                                    <button
                                        onClick={handleClose}
                                        className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {loadingInterestedProviders ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                            <span className="ml-2 text-gray-500">Loading providers...</span>
                                        </div>
                                    ) : interestedProviders.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">
                                                No providers have expressed interest yet
                                            </p>
                                        </div>
                                    ) : (
                                        interestedProviders.map((interest: ProviderInterest) => {
                                            const providerDetail = providerDetails[interest.provider_id];
                                            return (
                                                <div
                                                    key={interest.id}
                                                    className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden"
                                                >
                                                    {/* Provider Header */}
                                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                                                {interest.provider_name?.charAt(0) || 'P'}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                                                    {interest.provider_name}
                                                                </h3>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                    <Calendar className="w-4 h-4" />
                                                                    Expressed interest on {new Date(interest.expressed_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => onAssignProvider(interest.provider_id)}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                            Assign
                                                        </button>
                                                    </div>

                                                    {/* Provider Details */}
                                                    {providerDetail ? (
                                                        <div className="p-4 space-y-4">
                                                            {/* Rating and Stats Row */}
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Star className="w-4 h-4 text-yellow-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {providerDetail.average_rating?.toFixed(1) || 'N/A'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        ({providerDetail.completed_bookings_count || 0} jobs)
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Truck className="w-4 h-4 text-blue-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {providerDetail.vehicle_count || 0} vehicles
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin className="w-4 h-4 text-green-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {providerDetail.service_radius_km || 0}km radius
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Award className="w-4 h-4 text-purple-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {providerDetail.verification_status || 'Unknown'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                    {/* Contact Information */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">Contact Information</h4>
                                                            <div className="space-y-1">
                                                                {providerDetail.contact_person_phone && (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                        <Phone className="w-4 h-4" />
                                                                        {providerDetail.contact_person_phone}
                                                                    </div>
                                                                )}
                                                                {providerDetail.contact_person_email && (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                        <Mail className="w-4 h-4" />
                                                                        {providerDetail.contact_person_email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">Service Details</h4>
                                                            <div className="space-y-1">
                                                                {providerDetail.hourly_rate && (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                        <Clock className="w-4 h-4" />
                                                                        £{providerDetail.hourly_rate}/hour
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                                    <CheckCircle className={`w-4 h-4 ${providerDetail.accepts_instant_bookings ? 'text-green-500' : 'text-gray-400'}`} />
                                                                    {providerDetail.accepts_instant_bookings ? 'Accepts instant bookings' : 'No instant bookings'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Base Location */}
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">Base Location</h4>
                                                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900 dark:text-white">
                                                                    {formatLocationData(providerDetail)}
                                                                </div>
                                                                {getCoordinates(providerDetail) && (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                        Coordinates: {getCoordinates(providerDetail)?.lat.toFixed(6)}, {getCoordinates(providerDetail)?.lng.toFixed(6)}
                                                                    </div>
                                                                )}
                                                                {providerDetail.addresses && providerDetail.addresses.length > 1 && (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                        {providerDetail.addresses.length} address{providerDetail.addresses.length > 1 ? 'es' : ''} registered
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                            {/* Service Categories */}
                                                            {providerDetail.service_categories && providerDetail.service_categories.length > 0 && (
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">Service Categories</h4>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {providerDetail.service_categories.map((category: any, index: number) => (
                                                                            <span
                                                                                key={index}
                                                                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                                                                            >
                                                                                {category.name || category}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Specializations */}
                                                            {providerDetail.specializations && providerDetail.specializations.length > 0 && (
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">Specializations</h4>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {providerDetail.specializations.map((specialization: any, index: number) => (
                                                                            <span
                                                                                key={index}
                                                                                className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                                                                            >
                                                                                {specialization.name || specialization}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="p-4">
                                                            <div className="flex items-center justify-center py-4">
                                                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                                                <span className="ml-2 text-sm text-gray-500">Loading provider details...</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default InterestedProvidersModal;
