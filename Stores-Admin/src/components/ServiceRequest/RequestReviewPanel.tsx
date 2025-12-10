import React, { useState } from 'react';
import {
    IconChevronLeft,
    IconChevronRight,
    IconRoute,
    IconChevronDown,
    IconChevronUp,
    IconMapPin,
    IconClock,
    IconPackage,
    IconShieldCheck,
    IconTruck,
    IconStar,
    IconCheck,
    IconInfoCircle,
} from '@tabler/icons-react';
import { LoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { ServiceRequest } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface RequestReviewPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    currentStep: number;
    formValues: ServiceRequest;
    mapCenter: [number, number];
    routeCoordinates: [number, number][];
    pickupCoords: [number, number] | null;
    dropoffCoords: [number, number] | null;
    onAcceptRequest?: () => void;
    isAccepting?: boolean;
}

const RequestReviewPanel: React.FC<RequestReviewPanelProps> = ({
    isOpen,
    onToggle,
    currentStep,
    formValues,
    mapCenter,
    routeCoordinates,
    pickupCoords,
    dropoffCoords,
    onAcceptRequest,
    isAccepting = false,
}) => {
    const [isRequestDetailsOpen, setIsRequestDetailsOpen] = useState(true);
    const [isJourneyStopsOpen, setIsJourneyStopsOpen] = useState(true);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    // Calculate route when stops change
    React.useEffect(() => {
        if (!pickupCoords || !dropoffCoords) return;

        const directionsService = new google.maps.DirectionsService();
        const waypoints =
            formValues.journey_stops?.map((stop) => ({
                location: new google.maps.LatLng(stop.coordinates?.lat || 0, stop.coordinates?.lng || 0),
                stopover: true,
            })) || [];

        directionsService.route(
            {
                origin: new google.maps.LatLng(pickupCoords[0], pickupCoords[1]),
                destination: new google.maps.LatLng(dropoffCoords[0], dropoffCoords[1]),
                waypoints,
                optimizeWaypoints: false,
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    setDirections(result);
                }
            }
        );
    }, [pickupCoords, dropoffCoords, formValues.journey_stops]);

    const mapOptions = {
        disableDefaultUI: true,
        zoomControl: false,
        scrollwheel: false,
        draggable: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
    };

    return (
        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: isOpen ? '20%' : 0, opacity: isOpen ? 1 : 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="hidden lg:block">
            <div className="sticky top-16">
                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden flex flex-col h-[calc(100vh-4rem)] backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
                    {/* Panel Header */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white flex justify-between items-center"
                    >
                        <div className="flex items-center space-x-2">
                            <IconInfoCircle size={20} className="text-blue-200" />
                            <h3 className="font-semibold text-lg">Request Review</h3>
                        </div>
                        <button onClick={onToggle} className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 transform hover:scale-110">
                            {isOpen ? <IconChevronRight size={20} /> : <IconChevronLeft size={20} />}
                        </button>
                    </motion.div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6 p-4">
                            {/* Map Section - Always at top */}
                            {currentStep >= 2 && formValues.pickup_location && formValues.dropoff_location && (
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
                                    <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <IconRoute className="text-blue-600 dark:text-blue-400" size={20} />
                                        </div>
                                        <h4 className="font-medium">Route Preview</h4>
                                    </div>
                                    <div className="h-72 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg transform transition-transform duration-300 hover:scale-[1.02]">
                                        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} libraries={['places']}>
                                            <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: mapCenter[0], lng: mapCenter[1] }} zoom={11} options={mapOptions}>
                                                {pickupCoords && (
                                                    <Marker
                                                        position={{ lat: pickupCoords[0], lng: pickupCoords[1] }}
                                                        label={{
                                                            text: 'A',
                                                            color: '#FFFFFF',
                                                            className: 'font-bold',
                                                        }}
                                                    />
                                                )}
                                                {formValues.journey_stops?.map(
                                                    (stop, idx) =>
                                                        stop.coordinates && (
                                                            <Marker
                                                                key={stop.id}
                                                                position={{ lat: stop.coordinates.lat, lng: stop.coordinates.lng }}
                                                                label={{
                                                                    text: String.fromCharCode(66 + idx),
                                                                    color: '#FFFFFF',
                                                                    className: 'font-bold',
                                                                }}
                                                            />
                                                        )
                                                )}
                                                {dropoffCoords && (
                                                    <Marker
                                                        position={{ lat: dropoffCoords[0], lng: dropoffCoords[1] }}
                                                        label={{
                                                            text: String.fromCharCode(66 + (formValues.journey_stops?.length || 0)),
                                                            color: '#FFFFFF',
                                                            className: 'font-bold',
                                                        }}
                                                    />
                                                )}
                                                {directions && <DirectionsRenderer directions={directions} />}
                                            </GoogleMap>
                                        </LoadScript>
                                    </div>
                                </motion.div>
                            )}

                            {/* Journey Stops Section */}
                            {formValues.journey_stops && formValues.journey_stops.length > 0 && (
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                                    <button
                                        onClick={() => setIsJourneyStopsOpen(!isJourneyStopsOpen)}
                                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 rounded-xl hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700/70 dark:hover:to-gray-600/50 transition-all duration-200 shadow-sm"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                <IconMapPin className="text-purple-600 dark:text-purple-400" size={20} />
                                            </div>
                                            <h4 className="font-medium text-gray-700 dark:text-gray-300">Journey Stops</h4>
                                        </div>
                                        <motion.div animate={{ rotate: isJourneyStopsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                            <IconChevronDown size={20} />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {isJourneyStopsOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="mt-4 space-y-3 overflow-hidden"
                                            >
                                                {formValues.journey_stops.map((stop, index) => (
                                                    <motion.div
                                                        key={stop.id}
                                                        initial={{ x: -20, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
                                                    >
                                                        <div className="p-4">
                                                            <div className="flex items-start space-x-3">
                                                                <div
                                                                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                                                        stop.type === 'pickup'
                                                                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                                            : stop.type === 'dropoff'
                                                                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                                            : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                                    }`}
                                                                >
                                                                    <IconMapPin size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                                                            {stop.type === 'pickup' ? 'Pickup' : stop.type === 'dropoff' ? 'Dropoff' : `Stop ${index + 1}`}
                                                                        </h5>
                                                                        {stop.estimated_time && (
                                                                            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                                                                <IconClock size={14} className="mr-1" />
                                                                                {stop.estimated_time}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stop.location}</p>
                                                                    {stop.unit_number && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Unit {stop.unit_number}</p>}
                                                                    {stop.instructions && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stop.instructions}</p>}
                                                                    {stop.items && stop.items.length > 0 && (
                                                                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg w-fit">
                                                                            <IconPackage size={14} className="mr-1" />
                                                                            {stop.items.length} items
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* Request Details - Collapsible */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                                <button
                                    onClick={() => setIsRequestDetailsOpen(!isRequestDetailsOpen)}
                                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 rounded-xl hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700/70 dark:hover:to-gray-600/50 transition-all duration-200 shadow-sm"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <IconInfoCircle className="text-blue-600 dark:text-blue-400" size={20} />
                                        </div>
                                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Request Details</h4>
                                    </div>
                                    <motion.div animate={{ rotate: isRequestDetailsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <IconChevronDown size={20} />
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {isRequestDetailsOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-4 space-y-4 overflow-hidden"
                                        >
                                            {currentStep === 1 && (
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                                                >
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Contact Name:</span> {formValues.contact_name || 'Not provided'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Contact Phone:</span> {formValues.contact_phone || 'Not provided'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Contact Email:</span> {formValues.contact_email || 'Not provided'}
                                                    </p>
                                                </motion.div>
                                            )}
                                            {currentStep === 2 && (
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                                                >
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Pickup Location:</span> {formValues.pickup_location || 'Not provided'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Dropoff Location:</span> {formValues.dropoff_location || 'Not provided'}
                                                    </p>
                                                </motion.div>
                                            )}
                                            {currentStep === 3 && (
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                                                >
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Service Type:</span> {formValues.service_type || 'Not provided'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Items:</span> {formValues.moving_items?.length || 0} items
                                                    </p>
                                                </motion.div>
                                            )}
                                            {currentStep === 4 && (
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="space-y-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                                                >
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Preferred Date:</span> {formValues.preferred_date || 'Not provided'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="font-medium">Preferred Time:</span> {formValues.preferred_time || 'Not provided'}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Trust Badges Section */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3">
                                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 rounded-xl p-4 shadow-sm text-center transform transition-all duration-200 hover:scale-105 hover:shadow-md">
                                    <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-2">
                                        <IconStar className="text-green-600 dark:text-green-400" size={24} />
                                    </div>
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">4.9/5 Rating</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1000+ Reviews</p>
                                </div>

                                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 rounded-xl p-4 shadow-sm text-center transform transition-all duration-200 hover:scale-105 hover:shadow-md">
                                    <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                                        <IconShieldCheck className="text-blue-600 dark:text-blue-400" size={24} />
                                    </div>
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Secure Service</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fully Insured</p>
                                </div>

                                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700/50 rounded-xl p-4 shadow-sm text-center transform transition-all duration-200 hover:scale-105 hover:shadow-md">
                                    <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-2">
                                        <IconTruck className="text-purple-600 dark:text-purple-400" size={24} />
                                    </div>
                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Verified Drivers</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Background Checked</p>
                                </div>
                            </motion.div>

                            {/* Accept Request Button */}
                            {currentStep === 4 && (
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                                    <button
                                        onClick={onAcceptRequest}
                                        disabled={isAccepting}
                                        className={`w-full py-4 px-6 rounded-xl text-white font-medium text-lg flex items-center justify-center space-x-2 transition-all duration-200 ${
                                            isAccepting
                                                ? 'bg-gradient-to-r from-blue-400 to-blue-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 transform hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                    >
                                        {isAccepting ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconCheck size={20} />
                                                <span>Accept Request</span>
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">By accepting, you agree to our terms and conditions</p>
                                </motion.div>
                            )}

                            {/* Bottom Image */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="relative h-48 rounded-xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-[1.02]"
                            >
                                <img
                                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                                    alt="Professional Moving Service"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                                    <div className="p-4 text-white">
                                        <h4 className="font-semibold text-lg">Professional Moving Service</h4>
                                        <p className="text-sm text-white/80">Your trusted partner in relocation</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default RequestReviewPanel;
