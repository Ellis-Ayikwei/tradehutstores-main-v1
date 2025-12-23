import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruckMoving, faUser, faRoute, faClock, faBuilding, faDoorOpen, faStairs, faElevator, faCar, faHome, faInfoCircle, faBox } from '@fortawesome/free-solid-svg-icons';

interface JourneyStop {
    type: 'pickup' | 'dropoff' | 'waypoint';
    address: string;
    property_type?: string;
    unit_number?: string;
    floor?: string;
    has_elevator?: boolean;
    parking_info?: string;
    number_of_rooms?: string;
    instructions?: string;
}

interface JourneyOverviewProps {
    service_type: string;
    vehicle_type: string;
    persons_required: number;
    distance: number;
    estimated_travel_time: string;
    stops: JourneyStop[];
    items?: any[];
    special_instructions?: string;
}

const JourneyOverview: React.FC<JourneyOverviewProps> = ({ service_type, vehicle_type, persons_required, distance, estimated_travel_time, stops, items, special_instructions }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Move Summary - {service_type}</h2>

            {/* Journey stats */}
            {service_type === 'Residential Moving' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faTruckMoving} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Vehicle Type</p>
                                <p className="font-medium">{vehicle_type || 'van'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faUser} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Staff Required</p>
                                <p className="font-medium">{persons_required || 2}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faRoute} className="text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Distance</p>
                                <p className="font-medium">{distance || 0}km</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faClock} className="text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Est. Travel Time</p>
                                <p className="font-medium">{estimated_travel_time || 'Calculating...'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                <FontAwesomeIcon icon={faTruckMoving} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Service Type</p>
                                <p className="font-medium">{service_type}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Journey route visualization with stops */}
            <div className="relative mb-6">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-100"></div>

                {/* Stop items in sequence */}
                <div className="space-y-6">
                    {stops?.map((stop, index) => (
                        <div key={stop.type + index} className="relative pl-10">
                            {/* Timeline marker */}
                            <div
                                className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                    stop.type === 'pickup' ? 'bg-blue-500 text-white' : stop.type === 'dropoff' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                                }`}
                            >
                                <span className="text-xs font-bold">{index + 1}</span>
                            </div>

                            {/* Stop details */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-2">
                                <div className="flex justify-between items-start">
                                    <div className="w-full">
                                        <div className="flex items-center mb-2">
                                            <span
                                                className={`px-2 py-0.5 text-xs rounded-full ${
                                                    stop.type === 'pickup' ? 'bg-blue-100 text-blue-800' : stop.type === 'dropoff' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                }`}
                                            >
                                                {stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}
                                            </span>
                                            <h3 className="ml-2 font-medium text-gray-900">{stop.address || 'Address not specified'}</h3>
                                        </div>

                                        {/* Property Details */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faBuilding} className="text-gray-400 mr-2 w-4" />
                                                    <span className="text-gray-600">Property Type:</span>
                                                    <span className="ml-2 font-medium">{stop.property_type || 'Not specified'}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faDoorOpen} className="text-gray-400 mr-2 w-4" />
                                                    <span className="text-gray-600">Unit Number:</span>
                                                    <span className="ml-2 font-medium">{stop.unit_number || 'Not specified'}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faStairs} className="text-gray-400 mr-2 w-4" />
                                                    <span className="text-gray-600">Floor:</span>
                                                    <span className="ml-2 font-medium">{stop.floor || 'Ground'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faElevator} className="text-gray-400 mr-2 w-4" />
                                                    <span className="text-gray-600">Elevator:</span>
                                                    <span className="ml-2 font-medium">{stop.has_elevator ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faCar} className="text-gray-400 mr-2 w-4" />
                                                    <span className="text-gray-600">Parking Info:</span>
                                                    <span className="ml-2 font-medium">{stop.parking_info || 'Not specified'}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faHome} className="text-gray-400 mr-2 w-4" />
                                                    <span className="text-gray-600">Rooms:</span>
                                                    <span className="ml-2 font-medium">{stop.number_of_rooms || 'Not specified'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Instructions */}
                                        {stop.instructions && (
                                            <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                                                <div className="flex items-center text-sm">
                                                    <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400 mr-2" />
                                                    <span className="text-gray-600">Additional Instructions:</span>
                                                </div>
                                                <p className="mt-1 text-sm text-gray-700">{stop.instructions}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Items at this stop - shown when available */}
                            {index === 0 && items && items.length > 0 && (
                                <div className="ml-4 mt-2 mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Items to be picked up:</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {items?.map((item) => (
                                            <div key={item.id} className="bg-white p-2 border border-gray-200 rounded-md flex items-center">
                                                <FontAwesomeIcon icon={faBox} className="text-blue-400 mr-2" />
                                                <div>
                                                    <p className="text-sm font-medium">{item.name}</p>
                                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Special Instructions */}
            {special_instructions && (
                <div className="mt-4 bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-start">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-500 mt-1 mr-3" />
                        <div>
                            <h3 className="font-medium text-yellow-800 mb-1">Special Instructions</h3>
                            <p className="text-sm text-yellow-700">{special_instructions}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JourneyOverview;
