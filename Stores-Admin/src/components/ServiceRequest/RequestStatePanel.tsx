import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface RequestStatePanelProps {
    values: any;
}

const RequestStatePanel: React.FC<RequestStatePanelProps> = ({ values }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-gray-600 dark:text-gray-400" />
                    Request State
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                    {/* Contact Information */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Name:</span> {values.contact_name || 'Not set'}</p>
                            <p><span className="font-medium">Phone:</span> {values.contact_phone || 'Not set'}</p>
                            <p><span className="font-medium">Email:</span> {values.contact_email || 'Not set'}</p>
                        </div>
                    </div>

                    {/* Request Details */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Request Details</h4>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Request Type:</span> {values.request_type || 'Not set'}</p>
                            <p><span className="font-medium">Service Type:</span> {values.service_type || 'Not set'}</p>
                        </div>
                    </div>

                    {/* Pickup Details */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pickup Details</h4>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Location:</span> {values.pickup_location || 'Not set'}</p>
                            <p><span className="font-medium">Floor Level:</span> {values.pickup_floor || 'Not set'}</p>
                            <p><span className="font-medium">Property Type:</span> {values.propertyType || 'Not set'}</p>
                            <p><span className="font-medium">Total Floors:</span> {values.pickup_number_of_floors || 'Not set'}</p>
                        </div>
                    </div>

                    {/* Dropoff Details */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Dropoff Details</h4>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Location:</span> {values.dropoff_location || 'Not set'}</p>
                            <p><span className="font-medium">Floor Level:</span> {values.dropoff_floor || 'Not set'}</p>
                            <p><span className="font-medium">Property Type:</span> {values.dropoffPropertyType || 'Not set'}</p>
                            <p><span className="font-medium">Total Floors:</span> {values.dropoff_number_of_floors || 'Not set'}</p>
                        </div>
                    </div>

                    {/* Journey Stops (if applicable) */}
                    {values.request_type === 'journey' && values.journey_stops && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Journey Stops</h4>
                            <div className="space-y-4">
                                {values.journey_stops.map((stop: any, index: number) => (
                                    <div key={stop.id} className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Stop {index + 1}</h5>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Type:</span> {stop.type}</p>
                                            <p><span className="font-medium">Location:</span> {stop.location || 'Not set'}</p>
                                            <p><span className="font-medium">Floor:</span> {stop.floor || 'Not set'}</p>
                                            <p><span className="font-medium">Has Elevator:</span> {stop.has_elevator ? 'Yes' : 'No'}</p>
                                            <p><span className="font-medium">Instructions:</span> {stop.instructions || 'Not set'}</p>
                                            <p><span className="font-medium">Estimated Time:</span> {stop.estimated_time || 'Not set'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestStatePanel; 